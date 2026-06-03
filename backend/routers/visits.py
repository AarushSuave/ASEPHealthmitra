"""HealthMitra Scan – Visits Router"""
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Visit, User
from pydantic import BaseModel
from datetime import datetime, timezone
from routers.auth import get_current_user
from services.patient_sync import ensure_patient_for_user

router = APIRouter(prefix="/api/visits", tags=["Visits"])


class VisitCreate(BaseModel):
    patient_name: str
    village_name: str
    visit_date: datetime
    purpose: str
    notes: str = ""


class CheckInRequest(BaseModel):
    code: str


def _generate_check_in_code() -> str:
    return secrets.token_hex(4).upper()


def _visit_to_dict(v: Visit) -> dict:
    return {
        "id": v.id,
        "patient_name": v.patient_name,
        "village_name": v.village_name,
        "visit_date": v.visit_date.isoformat() if v.visit_date else None,
        "purpose": v.purpose,
        "status": v.status,
        "notes": v.notes,
        "check_in_code": v.check_in_code,
        "checked_in_at": v.checked_in_at.isoformat() if v.checked_in_at else None,
        "created_at": v.created_at.isoformat() if v.created_at else None,
    }


@router.get("/")
def get_visits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get visits for the logged-in user only."""
    visits = db.query(Visit).filter(Visit.user_id == user.id).order_by(Visit.visit_date.asc()).all()
    return [_visit_to_dict(v) for v in visits]


@router.post("/")
def create_visit(visit_data: VisitCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Schedule a visit; admin receives an auto-generated check-in code."""
    ensure_patient_for_user(db, user)
    new_visit = Visit(
        user_id=user.id,
        patient_name=visit_data.patient_name or user.name,
        village_name=visit_data.village_name or user.village or "Unassigned",
        visit_date=visit_data.visit_date,
        purpose=visit_data.purpose,
        notes=visit_data.notes,
        status="scheduled",
        check_in_code=_generate_check_in_code(),
    )
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    return {
        "message": "Visit created successfully",
        "id": new_visit.id,
        "check_in_code": new_visit.check_in_code,
    }


@router.post("/{visit_id}/check-in")
def check_in_with_code(
    visit_id: int,
    body: CheckInRequest,
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    """Patient checks in at hospital using the code given by admin."""
    visit = db.query(Visit).filter(Visit.id == visit_id, Visit.user_id == user.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    if visit.status == "completed":
        raise HTTPException(status_code=400, detail="Visit already checked in")
    if not visit.check_in_code:
        raise HTTPException(status_code=400, detail="No check-in code assigned for this visit")

    entered = (body.code or "").strip().upper()
    if entered != visit.check_in_code.upper():
        raise HTTPException(status_code=400, detail="Invalid check-in code")

    visit.status = "completed"
    visit.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Check-in successful", "visit_id": visit.id}


@router.put("/{visit_id}/complete")
def complete_visit(visit_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Legacy complete endpoint (prefer check-in with code)."""
    visit = db.query(Visit).filter(Visit.id == visit_id, Visit.user_id == user.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")

    visit.status = "completed"
    visit.checked_in_at = datetime.now(timezone.utc)
    db.commit()
    return {"message": "Visit marked as completed"}
