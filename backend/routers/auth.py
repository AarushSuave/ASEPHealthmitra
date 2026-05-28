"""HealthMitra Scan – Auth Router (JWT-based Authentication)"""
import os
import json
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalReport
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, PROFILE_PHOTO_DIR

import bcrypt
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])


# ── Helper functions ────────────────────────────────────────────────

def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())


def create_token(user_id: int) -> str:
    payload = {
        "sub": str(user_id),
        "exp": datetime.now(timezone.utc) + timedelta(hours=JWT_EXPIRY_HOURS),
        "iat": datetime.now(timezone.utc)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """Decode JWT token and return current user."""
    if not credentials:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
    except (JWTError, ValueError, TypeError):
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


def get_optional_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    """Try to get current user, return None if not authenticated."""
    if not credentials:
        return None
    try:
        payload = jwt.decode(credentials.credentials, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = int(payload.get("sub"))
        return db.query(User).filter(User.id == user_id).first()
    except Exception:
        return None


def _user_to_dict(user: User) -> dict:
    return {
        "id": user.id,
        "name": user.name,
        "email": user.email,
        "phone": user.phone,
        "age": user.age,
        "gender": user.gender,
        "blood_group": user.blood_group,
        "profile_photo": f"/uploads/profiles/{os.path.basename(user.profile_photo)}" if user.profile_photo else None,
        "medical_conditions": json.loads(user.medical_conditions) if user.medical_conditions else [],
        "allergies": json.loads(user.allergies) if user.allergies else [],
        "emergency_contact": user.emergency_contact,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


# ── Routes ──────────────────────────────────────────────────────────

@router.post("/register")
async def register(
    name: str = Form(...),
    email: str = Form(...),
    password: str = Form(...),
    phone: str = Form(None),
    age: int = Form(None),
    gender: str = Form(None),
    blood_group: str = Form(None),
    db: Session = Depends(get_db)
):
    """Register a new user account."""
    # Check if email already exists
    existing = db.query(User).filter(User.email == email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user = User(
        name=name,
        email=email,
        password_hash=hash_password(password),
        phone=phone,
        age=age,
        gender=gender,
        blood_group=blood_group,
    )
    db.add(user)
    db.commit()
    db.refresh(user)

    token = create_token(user.id)
    return {
        "token": token,
        "user": _user_to_dict(user),
        "message": "Account created successfully"
    }


@router.post("/login")
async def login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login with email and password."""
    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    token = create_token(user.id)
    return {
        "token": token,
        "user": _user_to_dict(user),
        "message": "Login successful"
    }


@router.get("/me")
async def get_profile(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get current user profile with health data summary."""
    # Gather health stats
    report_count = db.query(MedicalReport).filter(MedicalReport.user_id == user.id).count()
    # Latest risk score
    latest_report = db.query(MedicalReport).filter(
        MedicalReport.user_id == user.id
    ).order_by(MedicalReport.created_at.desc()).first()

    profile = _user_to_dict(user)
    profile["health_stats"] = {
        "total_reports": report_count,
        "latest_risk_score": latest_report.risk_score if latest_report else None,
        "latest_risk_level": latest_report.risk_level if latest_report else None,
    }
    return profile


@router.put("/profile")
async def update_profile(
    name: str = Form(None),
    phone: str = Form(None),
    age: int = Form(None),
    gender: str = Form(None),
    blood_group: str = Form(None),
    medical_conditions: str = Form(None),
    allergies: str = Form(None),
    emergency_contact: str = Form(None),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile fields."""
    if name:
        user.name = name
    if phone is not None:
        user.phone = phone
    if age is not None:
        user.age = age
    if gender is not None:
        user.gender = gender
    if blood_group is not None:
        user.blood_group = blood_group
    if medical_conditions is not None:
        user.medical_conditions = medical_conditions
    if allergies is not None:
        user.allergies = allergies
    if emergency_contact is not None:
        user.emergency_contact = emergency_contact

    db.commit()
    db.refresh(user)
    return {"user": _user_to_dict(user), "message": "Profile updated successfully"}


@router.post("/upload-photo")
async def upload_profile_photo(
    file: UploadFile = File(...),
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Upload/update profile photo."""
    # Delete old photo
    if user.profile_photo and os.path.exists(user.profile_photo):
        os.remove(user.profile_photo)

    # Save new photo
    ext = os.path.splitext(file.filename)[1] or ".jpg"
    filename = f"user_{user.id}{ext}"
    file_path = os.path.join(PROFILE_PHOTO_DIR, filename)

    with open(file_path, "wb") as f:
        content = await file.read()
        f.write(content)

    user.profile_photo = file_path
    db.commit()
    db.refresh(user)

    return {
        "profile_photo": f"/uploads/profiles/{filename}",
        "message": "Profile photo updated"
    }
