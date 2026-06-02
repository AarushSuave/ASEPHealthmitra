"""HealthMitra Scan – Admin Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func
from database import get_db
from models import Patient, User, MedicalReport, Visit
from routers.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Allow only admin or ASHA coordinator roles."""
    if user.role not in ("admin", "asha_coordinator"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


@router.get("/patients")
def get_all_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: Get all patients with basic details and severity ranking."""
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()

    result = []
    for p in patients:
        latest_report = db.query(MedicalReport).filter(
            MedicalReport.patient_id == p.id
        ).order_by(MedicalReport.created_at.desc()).first()
        severity_score = float(latest_report.risk_score) if latest_report and latest_report.risk_score is not None else 0.0

        next_visit = db.query(Visit).filter(
            Visit.patient_name == p.name,
            Visit.village_name == p.village,
            Visit.status == "scheduled",
        ).order_by(Visit.visit_date.asc()).first()

        result.append({
            "id": p.id,
            "name": p.name,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "village": p.village,
            "phone": p.phone,
            "asha_worker_id": p.asha_worker_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "severity_score": round(severity_score, 1),
            "next_visit": next_visit.visit_date.isoformat() if next_visit and next_visit.visit_date else None,
        })

    # Sort descending by severity for admin UI
    result.sort(key=lambda r: r["severity_score"], reverse=True)
    return result


@router.get("/villages")
def get_village_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: Get statistics for each village."""
    village_stats = db.query(
        Patient.village,
        func.count(Patient.id).label('patient_count')
    ).filter(Patient.village != None).group_by(Patient.village).all()

    results = []
    for v in village_stats:
        avg_risk = db.query(func.avg(MedicalReport.risk_score)).join(
            Patient, MedicalReport.patient_id == Patient.id
        ).filter(Patient.village == v.village).scalar() or 0.0
        results.append({
            "village": v.village,
            "patient_count": v.patient_count,
            "avg_risk_score": round(float(avg_risk), 1),
        })
    return results
