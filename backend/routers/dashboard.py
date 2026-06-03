"""HealthMitra Scan – Dashboard Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import MedicalReport, Patient, HealthTimeline
from routers.auth import get_optional_user

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])


@router.get("/stats")
def get_dashboard_stats(
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Get aggregated counts for dashboard cards (per user when logged in)."""
    if current_user:
        report_count = db.query(MedicalReport).filter(
            MedicalReport.user_id == current_user.id
        ).count()
        return {
            "reports": report_count,
            "patients": 1,
        }
    return {
        "reports": db.query(MedicalReport).count(),
        "patients": db.query(Patient).count(),
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
