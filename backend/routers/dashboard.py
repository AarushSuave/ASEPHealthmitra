"""HealthMitra Scan – Dashboard Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import MedicalReport, Patient, HealthTimeline
from typing import List, Dict, Any

router = APIRouter(prefix="/api/dashboard", tags=["Dashboard"])

@router.get("/stats")
def get_dashboard_stats(db: Session = Depends(get_db)):
    """Get aggregated counts for dashboard cards."""
    return {
        "reports": db.query(MedicalReport).count(),
        "patients": db.query(Patient).count(),
    }

@router.get("/activity")
def get_recent_activity(db: Session = Depends(get_db)):
    """Get the latest 5 entries from the health timeline."""
    activities = db.query(HealthTimeline).order_by(HealthTimeline.created_at.desc()).limit(5).all()
    
    return [{
        "id": a.id,
        "event_type": a.event_type,
        "title": a.title,
        "desc": a.description,
        "risk_score": a.risk_score,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in activities]

@router.get("/timeline")
def get_full_timeline(db: Session = Depends(get_db)):
    """Get all entries from the health timeline."""
    activities = db.query(HealthTimeline).order_by(HealthTimeline.created_at.desc()).all()
    
    return [{
        "id": a.id,
        "event_type": a.event_type,
        "title": a.title,
        "desc": a.description,
        "risk_score": a.risk_score,
        "created_at": a.created_at.isoformat() if a.created_at else None
    } for a in activities]
