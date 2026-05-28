"""HealthMitra Scan – Patient Management Router"""
import json
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import Patient, MedicalReport, HealthTimeline
from schemas import PatientCreate

router = APIRouter(prefix="/api/patients", tags=["Patients"])


@router.post("/create")
def create_patient(patient: PatientCreate, db: Session = Depends(get_db)):
    """Create a new patient profile (for rural ASHA worker mode)."""
    db_patient = Patient(**patient.model_dump())
    db.add(db_patient)
    db.commit()
    db.refresh(db_patient)
    return {
        "id": db_patient.id,
        "name": db_patient.name,
        "age": db_patient.age,
        "gender": db_patient.gender,
        "blood_group": db_patient.blood_group,
        "village": db_patient.village,
        "created_at": db_patient.created_at.isoformat() if db_patient.created_at else None
    }


@router.get("/list")
def list_patients(asha_worker_id: str = None, db: Session = Depends(get_db)):
    """List all patients, optionally filtered by ASHA worker."""
    query = db.query(Patient)
    if asha_worker_id:
        query = query.filter(Patient.asha_worker_id == asha_worker_id)
    patients = query.order_by(Patient.created_at.desc()).all()

    return [{
        "id": p.id,
        "name": p.name,
        "age": p.age,
        "gender": p.gender,
        "blood_group": p.blood_group,
        "village": p.village,
        "report_count": len(p.reports)
    } for p in patients]


@router.get("/{patient_id}")
def get_patient(patient_id: int, db: Session = Depends(get_db)):
    """Get patient details with health summary."""
    patient = db.query(Patient).filter(Patient.id == patient_id).first()
    if not patient:
        return {"error": "Patient not found"}

    reports = db.query(MedicalReport).filter(MedicalReport.patient_id == patient_id).all()
    timeline = db.query(HealthTimeline).filter(
        HealthTimeline.patient_id == patient_id
    ).order_by(HealthTimeline.created_at.desc()).limit(20).all()

    avg_risk = sum(r.risk_score for r in reports if r.risk_score) / max(len(reports), 1)

    return {
        "id": patient.id,
        "name": patient.name,
        "age": patient.age,
        "gender": patient.gender,
        "blood_group": patient.blood_group,
        "village": patient.village,
        "phone": patient.phone,
        "report_count": len(reports),
        "avg_risk_score": round(avg_risk, 1),
        "timeline": [{
            "id": t.id,
            "event_type": t.event_type,
            "title": t.title,
            "description": t.description,
            "risk_score": t.risk_score,
            "created_at": t.created_at.isoformat() if t.created_at else None
        } for t in timeline]
    }


@router.get("/timeline/{patient_id}")
def get_patient_timeline(patient_id: int, db: Session = Depends(get_db)):
    """Get health timeline for a patient."""
    timeline = db.query(HealthTimeline).filter(
        HealthTimeline.patient_id == patient_id
    ).order_by(HealthTimeline.created_at.desc()).limit(50).all()

    return [{
        "id": t.id,
        "event_type": t.event_type,
        "title": t.title,
        "description": t.description,
        "risk_score": t.risk_score,
        "data": json.loads(t.data_json) if t.data_json else {},
        "created_at": t.created_at.isoformat() if t.created_at else None
    } for t in timeline]
