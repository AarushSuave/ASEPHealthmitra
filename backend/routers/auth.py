"""HealthMitra Scan – Auth Router (JWT-based Authentication)"""
import os
import json
from pathlib import Path
from datetime import datetime, timedelta, timezone
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalReport, HealthTimeline
from services.patient_sync import ensure_patient_for_user, sync_user_profile_fields
from config import JWT_SECRET, JWT_ALGORITHM, JWT_EXPIRY_HOURS, PROFILE_PHOTO_DIR

import bcrypt
from jose import jwt, JWTError
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials

security = HTTPBearer(auto_error=False)
router = APIRouter(prefix="/api/auth", tags=["Authentication"])
ASHA_CREDENTIALS_PATH = Path(__file__).resolve().parents[2] / "asha_credentials.txt"
USER_CREDENTIALS_PATH = Path(__file__).resolve().parents[2] / "user_credentials.txt"
DEFAULT_ASHA_EMAIL = "asha@healthmitra.local"
DEFAULT_ASHA_PASSWORD = "Asha@123"
DEFAULT_USER_EMAIL = "user@healthmitra.local"
DEFAULT_USER_PASSWORD = "User@123"


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
        "village": user.village,
        "height_cm": user.height_cm,
        "weight_kg": user.weight_kg,
        "role": user.role,
        "created_at": user.created_at.isoformat() if user.created_at else None,
    }


def _parse_credentials_file(path: Path, default_email: str, default_password: str, header: str) -> tuple[str, str]:
    """Read or create a key=value credentials file."""
    if not path.exists():
        path.write_text(
            f"{header}\nemail={default_email}\npassword={default_password}\n",
            encoding="utf-8",
        )
        return default_email, default_password

    raw = path.read_text(encoding="utf-8")
    email = ""
    password = ""
    for line in raw.splitlines():
        row = line.strip()
        if not row or row.startswith("#") or "=" not in row:
            continue
        key, value = row.split("=", 1)
        key = key.strip().lower()
        value = value.strip()
        if key == "email":
            email = value
        elif key == "password":
            password = value

    return email or default_email, password or default_password


def _ensure_user_credentials_file() -> tuple[str, str]:
    return _parse_credentials_file(
        USER_CREDENTIALS_PATH,
        DEFAULT_USER_EMAIL,
        DEFAULT_USER_PASSWORD,
        "# HealthMitra User Credentials\n# Change these values after first login.",
    )


def _ensure_asha_credentials_file() -> tuple[str, str]:
    return _parse_credentials_file(
        ASHA_CREDENTIALS_PATH,
        DEFAULT_ASHA_EMAIL,
        DEFAULT_ASHA_PASSWORD,
        "# ASHA Coordinator Credentials\n# Change these values after first login.",
    )


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
    ensure_patient_for_user(db, user)

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
    """Login with email and password (file credentials or registered account)."""
    file_email, file_password = _ensure_user_credentials_file()
    if email.strip().lower() == file_email.strip().lower() and password == file_password:
        user = db.query(User).filter(User.email == file_email).first()
        if not user:
            user = User(
                name="HealthMitra User",
                email=file_email,
                password_hash=hash_password(file_password),
                role="user",
            )
            db.add(user)
            db.commit()
            db.refresh(user)
        else:
            if user.role not in ("user",):
                user.role = "user"
            user.password_hash = hash_password(file_password)
            db.commit()
            db.refresh(user)
        if user.role == "user":
            ensure_patient_for_user(db, user)
        token = create_token(user.id)
        return {
            "token": token,
            "user": _user_to_dict(user),
            "message": "Login successful",
        }

    user = db.query(User).filter(User.email == email).first()
    if not user or not verify_password(password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid email or password")

    if user.role == "user":
        ensure_patient_for_user(db, user)

    token = create_token(user.id)
    return {
        "token": token,
        "user": _user_to_dict(user),
        "message": "Login successful"
    }


@router.post("/asha-login")
async def asha_login(
    email: str = Form(...),
    password: str = Form(...),
    db: Session = Depends(get_db)
):
    """Login as ASHA coordinator using local text credentials."""
    expected_email, expected_password = _ensure_asha_credentials_file()
    if email.strip().lower() != expected_email.strip().lower() or password != expected_password:
        raise HTTPException(status_code=401, detail="Invalid ASHA coordinator credentials")

    asha_user = db.query(User).filter(User.email == expected_email).first()
    if not asha_user:
        asha_user = User(
            name="ASHA Coordinator",
            email=expected_email,
            password_hash=hash_password(expected_password),
            role="asha_coordinator"
        )
        db.add(asha_user)
        db.commit()
        db.refresh(asha_user)
    else:
        if asha_user.role != "asha_coordinator":
            asha_user.role = "asha_coordinator"
        asha_user.password_hash = hash_password(expected_password)
        db.commit()
        db.refresh(asha_user)

    token = create_token(asha_user.id)
    return {
        "token": token,
        "user": _user_to_dict(asha_user),
        "message": "ASHA coordinator login successful"
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
    latest_vitals = db.query(HealthTimeline).filter(
        HealthTimeline.user_id == user.id,
        HealthTimeline.event_type == "vitals",
    ).order_by(HealthTimeline.created_at.desc()).first()

    diabetes_risk = None
    heart_risk = None
    combined_risk = None
    if latest_vitals and latest_vitals.data_json:
        try:
            vd = json.loads(latest_vitals.data_json)
            diabetes_risk = vd.get("diabetes_risk")
            heart_risk = vd.get("heart_risk")
            combined_risk = vd.get("combined_risk") or (
                round((diabetes_risk + heart_risk) / 2) if diabetes_risk is not None and heart_risk is not None else None
            )
        except Exception:
            pass

    profile["health_stats"] = {
        "total_reports": report_count,
        "latest_risk_score": latest_report.risk_score if latest_report else combined_risk,
        "latest_risk_level": latest_report.risk_level if latest_report else None,
        "latest_report_filename": latest_report.filename if latest_report else None,
        "diabetes_risk": diabetes_risk,
        "heart_risk": heart_risk,
        "combined_risk": combined_risk,
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
    village: str = Form(None),
    height_cm: float = Form(None),
    weight_kg: float = Form(None),
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
    if village is not None:
        user.village = village
    if height_cm is not None:
        user.height_cm = height_cm
    if weight_kg is not None:
        user.weight_kg = weight_kg

    db.commit()
    db.refresh(user)
    if user.role == "user":
        sync_user_profile_fields(db, user)
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
