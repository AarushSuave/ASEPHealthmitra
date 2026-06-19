"""HealthMitra Scan – Dashboard Router"""
from datetime import datetime, timezone
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import MedicalReport, Patient, HealthTimeline, Visit
from routers.auth import get_optional_user, get_current_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


def _visit_urgency(visit_date, status: str) -> str:
    """Return urgency tier for visit tracker glow: critical | warning | normal | none."""
    if status in ("completed", "cancelled"):
        return "none"
    if not visit_date:
        return "normal"
    now = datetime.now(timezone.utc)
    if visit_date.tzinfo is None:
        visit_date = visit_date.replace(tzinfo=timezone.utc)
    days = (visit_date - now).total_seconds() / 86400
    if days < 0:
        return "critical"
    if days <= 2:
        return "critical"
    if days <= 7:
        return "warning"
    return "normal"


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Get aggregated counts for dashboard cards (per user when logged in)."""
    if current_user:
        visits = db.query(Visit).filter(Visit.user_id == current_user.id).all()
        upcoming = [v for v in visits if v.status == "scheduled"]
        next_visit = None
        urgency = "none"
        if upcoming:
            upcoming.sort(key=lambda v: v.visit_date or datetime.max.replace(tzinfo=timezone.utc))
            nv = upcoming[0]
            urgency = _visit_urgency(nv.visit_date, nv.status)
            next_visit = {
                "id": nv.id,
                "patient_name": nv.patient_name,
                "village_name": nv.village_name,
                "visit_date": nv.visit_date.isoformat() if nv.visit_date else None,
                "purpose": nv.purpose,
                "status": nv.status,
                "urgency": urgency,
            }
        return {
            "reports": db.query(MedicalReport).filter(MedicalReport.user_id == current_user.id).count(),
            "patients": 1,
            "upcoming_visits": len(upcoming),
            "completed_visits": len([v for v in visits if v.status == "completed"]),
            "next_visit": next_visit,
            "visit_urgency": urgency,
            "profile": {
                "age": current_user.age,
                "blood_group": current_user.blood_group,
                "village": current_user.village,
            },
        }
    return {
        "reports": db.query(MedicalReport).count(),
        "patients": db.query(Patient).count(),
        "upcoming_visits": db.query(Visit).filter(Visit.status == "scheduled").count(),
        "completed_visits": db.query(Visit).filter(Visit.status == "completed").count(),
        "next_visit": None,
        "visit_urgency": "none",
        "profile": {},
    }


@router.get("/activity")
def get_recent_activity(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Get the latest timeline entries for the current user."""
    query = db.query(HealthTimeline)
    if current_user:
        query = query.filter(HealthTimeline.user_id == current_user.id)
    activities = query.order_by(HealthTimeline.created_at.desc()).limit(5).all()

    return [{
        "id": a.id,
        "event_type": a.event_type,
        "title": a.title,
        "desc": a.description,
        "risk_score": a.risk_score,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in activities]


@router.get("/timeline")
def get_full_timeline(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Get health timeline for the current user."""
    query = db.query(HealthTimeline)
    if current_user:
        query = query.filter(HealthTimeline.user_id == current_user.id)
    activities = query.order_by(HealthTimeline.created_at.desc()).all()

    return [{
        "id": a.id,
        "event_type": a.event_type,
        "title": a.title,
        "desc": a.description,
        "description": a.description,
        "risk_score": a.risk_score,
        "created_at": a.created_at.isoformat() if a.created_at else None,
    } for a in activities]
