"""HealthMitra Scan – Visits Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from database import get_db
from models import Visit, User
from pydantic import BaseModel
from datetime import datetime
from routers.auth import get_current_user

router = APIRouter(prefix="/api/visits", tags=["Visits"])

class VisitCreate(BaseModel):
    patient_name: str
    village_name: str
    visit_date: datetime
    purpose: str
    notes: str = ""

@router.get("/")
def get_visits(user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Get all visits for the current user."""
    visits = db.query(Visit).filter(Visit.user_id == user.id).order_by(Visit.visit_date.asc()).all()
    return [{
        "id": v.id,
        "patient_name": v.patient_name,
        "village_name": v.village_name,
        "visit_date": v.visit_date.isoformat() if v.visit_date else None,
        "purpose": v.purpose,
        "status": v.status,
        "notes": v.notes,
        "created_at": v.created_at.isoformat() if v.created_at else None
    } for v in visits]

@router.post("/")
def create_visit(visit_data: VisitCreate, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Create a new visit."""
    new_visit = Visit(
        user_id=user.id,
        patient_name=visit_data.patient_name,
        village_name=visit_data.village_name,
        visit_date=visit_data.visit_date,
        purpose=visit_data.purpose,
        notes=visit_data.notes,
        status="scheduled"
    )
    db.add(new_visit)
    db.commit()
    db.refresh(new_visit)
    return {"message": "Visit created successfully", "id": new_visit.id}

@router.put("/{visit_id}/complete")
def complete_visit(visit_id: int, user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    """Mark a visit as completed (e.g. after QR scan)."""
    visit = db.query(Visit).filter(Visit.id == visit_id, Visit.user_id == user.id).first()
    if not visit:
        raise HTTPException(status_code=404, detail="Visit not found")
    
    visit.status = "completed"
    db.commit()
    return {"message": "Visit marked as completed"}
