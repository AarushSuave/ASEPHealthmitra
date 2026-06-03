"""HealthMitra Scan – Admin Router"""
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import func, or_
from database import get_db
from models import Patient, User, MedicalReport, Visit, HealthTimeline
from routers.auth import get_current_user

router = APIRouter(prefix="/api/admin", tags=["Admin"])


def require_admin(user: User = Depends(get_current_user)) -> User:
    """Allow only admin or ASHA coordinator roles."""
    if user.role not in ("admin", "asha_coordinator"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


def _patient_reports_query(db: Session, patient: Patient):
    """Reports linked by patient_id or by registered user account."""
    filters = [MedicalReport.patient_id == patient.id]
    if patient.user_id:
        filters.append(MedicalReport.user_id == patient.user_id)
    return db.query(MedicalReport).filter(or_(*filters))


def _patient_latest_vitals(db: Session, patient: Patient):
    q = db.query(HealthTimeline).filter(HealthTimeline.event_type == "vitals")
    if patient.user_id:
        q = q.filter(
            or_(
                HealthTimeline.patient_id == patient.id,
                HealthTimeline.user_id == patient.user_id,
            )
        )
    else:
        q = q.filter(HealthTimeline.patient_id == patient.id)
    return q.order_by(HealthTimeline.created_at.desc()).first()


@router.get("/patients")
def get_all_patients(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: all patients with severity and next visit."""
    patients = db.query(Patient).order_by(Patient.created_at.desc()).all()

    result = []
    for p in patients:
        latest_report = _patient_reports_query(db, p).order_by(MedicalReport.created_at.desc()).first()
        severity_score = float(latest_report.risk_score) if latest_report and latest_report.risk_score is not None else 0.0

        vitals_entry = _patient_latest_vitals(db, p)
        if vitals_entry and vitals_entry.risk_score:
            severity_score = max(severity_score, float(vitals_entry.risk_score))

        visit_filters = [Visit.patient_name == p.name]
        if p.user_id:
            visit_filters.append(Visit.user_id == p.user_id)
        next_visit = db.query(Visit).filter(
            or_(*visit_filters),
            Visit.status == "scheduled",
        ).order_by(Visit.visit_date.asc()).first()

        result.append({
            "id": p.id,
            "user_id": p.user_id,
            "name": p.name,
            "email": db.query(User.email).filter(User.id == p.user_id).scalar() if p.user_id else None,
            "age": p.age,
            "gender": p.gender,
            "blood_group": p.blood_group,
            "village": p.village,
            "phone": p.phone,
            "asha_worker_id": p.asha_worker_id,
            "created_at": p.created_at.isoformat() if p.created_at else None,
            "severity_score": round(severity_score, 1),
            "next_visit": next_visit.visit_date.isoformat() if next_visit and next_visit.visit_date else None,
            "report_count": _patient_reports_query(db, p).count(),
        })

    result.sort(key=lambda r: r["severity_score"], reverse=True)
    return result


@router.get("/visits")
def get_scheduled_visits(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: upcoming visits with check-in codes for front desk."""
    visits = db.query(Visit).filter(Visit.status == "scheduled").order_by(Visit.visit_date.asc()).all()
    return [{
        "id": v.id,
        "patient_name": v.patient_name,
        "village_name": v.village_name,
        "visit_date": v.visit_date.isoformat() if v.visit_date else None,
        "purpose": v.purpose,
        "check_in_code": v.check_in_code,
        "user_id": v.user_id,
    } for v in visits]


@router.get("/villages")
def get_village_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Admin: statistics for each village."""
    village_stats = db.query(
        Patient.village,
        func.count(Patient.id).label('patient_count')
    ).filter(Patient.village != None).group_by(Patient.village).all()

    results = []
    for v in village_stats:
        village_patients = db.query(Patient).filter(Patient.village == v.village).all()
        patient_ids = [p.id for p in village_patients]
        user_ids = [p.user_id for p in village_patients if p.user_id]

        risk_filters = []
        if patient_ids:
            risk_filters.append(MedicalReport.patient_id.in_(patient_ids))
        if user_ids:
            risk_filters.append(MedicalReport.user_id.in_(user_ids))

        avg_risk = 0.0
        if risk_filters:
            avg_risk = db.query(func.avg(MedicalReport.risk_score)).filter(
                or_(*risk_filters)
            ).scalar() or 0.0

        results.append({
            "village": v.village,
            "patient_count": v.patient_count,
            "avg_risk_score": round(float(avg_risk), 1),
        })
    return results
