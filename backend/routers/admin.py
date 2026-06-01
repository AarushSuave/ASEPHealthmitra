"""HealthMitra Scan – Admin Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Patient, User, MedicalReport

# NOTE: In a real application, you'd add a dependency to verify the user is an admin.
router = APIRouter(prefix="/api/admin", tags=["Admin"])

@router.get("/patients")
def get_all_patients(db: Session = Depends(get_db)):
    """Admin: Get all patients with basic details."""
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()
    
    # Optional: fetch report count per patient if needed, but keeping it light for now
    return [{
        "id": p.id,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "blood_group": p.blood_group,
        "village": p.village,
        "phone": p.phone,
        "asha_worker_id": p.asha_worker_id,
        "created_at": p.created_at.isoformat() if p.created_at else None
    } for p in patients]

@router.get("/villages")
def get_village_stats(db: Session = Depends(get_db)):
    """Admin: Get statistics for each village."""
    # Group by village and count patients
    village_stats = db.query(
        Patient.village, 
        func.count(Patient.id).label('patient_count')
    ).filter(Patient.village != None).group_by(Patient.village).all()
    
    return [{
        "village": v.village,
        "patient_count": v.patient_count,
        # Placeholder for average risk score or other metrics
        "avg_risk_score": 25.0 + (v.patient_count % 10) # dummy logic for now
    } for v in village_stats]
