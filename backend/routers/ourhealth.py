"""OurHealth Mode – ASHA coordinator dashboard synced with registered users."""
import json
import hashlib
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import or_, and_
from database import get_db
from models import Patient, User, MedicalReport, Visit, HealthTimeline, FamilyLink
from routers.admin import require_admin, _patient_reports_query, _patient_latest_vitals
from schemas import PatientCreate
import secrets

router = APIRouter(prefix="/api/ourhealth", tags=["OurHealth"])


def _village_coords(name: str) -> dict:
    """Stable map position for any village name (including newly registered)."""
    if not name:
        return {"x": 50, "y": 50}
    digest = hashlib.md5(name.strip().lower().encode()).hexdigest()
    x = 12 + (int(digest[:4], 16) % 76)
    y = 12 + (int(digest[4:8], 16) % 76)
    return {"x": x, "y": y}


def _sample_phone(patient_id: int, user_id: int | None) -> str:
    seed = user_id or patient_id
    return f"98{900000000 + (seed % 100000000):09d}"[-10:]


def _parse_conditions(user: User | None) -> list:
    if not user or not user.medical_conditions:
        return []
    try:
        data = json.loads(user.medical_conditions)
        return data if isinstance(data, list) else [str(data)]
    except Exception:
        return [user.medical_conditions] if user.medical_conditions else []


def _risk_history_from_reports(reports: list, fallback: float) -> list:
    scores = [float(r.risk_score) for r in reports if r.risk_score is not None]
    if not scores:
        return [fallback] * 5
    history = scores[-5:]
    while len(history) < 5:
        history.insert(0, history[0] if history else fallback)
    return history


def _enrich_patient(db: Session, patient: Patient) -> dict:
    user = db.query(User).filter(User.id == patient.user_id).first() if patient.user_id else None
    reports = _patient_reports_query(db, patient).order_by(MedicalReport.created_at.desc()).all()
    vitals_entry = _patient_latest_vitals(db, patient)

    risk = 0.0
    if reports and reports[0].risk_score is not None:
        risk = float(reports[0].risk_score)
    elif vitals_entry and vitals_entry.risk_score is not None:
        risk = float(vitals_entry.risk_score)

    risk_history = _risk_history_from_reports(reports, risk)

    visit_filters = []
    if patient.user_id:
        visit_filters.append(Visit.user_id == patient.user_id)
    if patient.name:
        visit_filters.append(
            and_(Visit.patient_name == patient.name, Visit.village_name == (patient.village or ""))
        )
    visits_q = db.query(Visit)
    if visit_filters:
        visits_q = visits_q.filter(or_(*visit_filters))
    all_visits = visits_q.order_by(Visit.visit_date.desc()).all()

    now = datetime.now(timezone.utc)
    scheduled = [v for v in all_visits if v.status == "scheduled"]
    completed = [v for v in all_visits if v.status == "completed"]
    next_visit = scheduled[0] if scheduled else None

    followup = "scheduled"
    if next_visit and next_visit.visit_date:
        visit_dt = next_visit.visit_date
        if visit_dt.tzinfo is None:
            visit_dt = visit_dt.replace(tzinfo=timezone.utc)
        if visit_dt < now:
            followup = "overdue"

    phone = patient.phone or (user.phone if user else None)
    if not phone:
        phone = _sample_phone(patient.id, patient.user_id)

    report_summaries = []
    for r in reports[:5]:
        summary = ""
        if r.explanation_en:
            summary = (r.explanation_en[:180] + "…") if len(r.explanation_en) > 180 else r.explanation_en
        report_summaries.append({
            "id": r.id,
            "filename": r.filename,
            "risk_score": r.risk_score,
            "risk_level": r.risk_level,
            "created_at": r.created_at.isoformat() if r.created_at else None,
            "summary": summary,
        })

    flags = []
    if risk >= 60:
        flags.append("high risk")
    if len(reports) == 0 and patient.user_id:
        flags.append("no reports")
    flags.extend(_parse_conditions(user)[:2])

    village = patient.village or (user.village if user else None) or "Unassigned"

    family_members = []
    household_ids = [patient.user_id] if patient.user_id else []
    if patient.user_id:
        for link in db.query(FamilyLink).filter(FamilyLink.user_id == patient.user_id).all():
            household_ids.append(link.linked_user_id)
            linked_user = db.query(User).filter(User.id == link.linked_user_id).first()
            linked_patient = db.query(Patient).filter(Patient.user_id == link.linked_user_id).first()
            if linked_user and linked_patient:
                lr = _patient_reports_query(db, linked_patient).order_by(
                    MedicalReport.created_at.desc()
                ).first()
                fam_risk = float(lr.risk_score) if lr and lr.risk_score is not None else 0.0
                family_members.append({
                    "id": linked_patient.id,
                    "user_id": linked_user.id,
                    "name": linked_user.name,
                    "email": linked_user.email,
                    "phone": linked_user.phone,
                    "relation": link.relation,
                    "village": linked_user.village,
                    "risk": round(fam_risk, 1),
                })
    household_key = min(household_ids) if household_ids else patient.id

    return {
        "id": patient.id,
        "user_id": patient.user_id,
        "name": patient.name,
        "age": patient.age or (user.age if user else 0),
        "gender": patient.gender or (user.gender if user else "Unknown"),
        "blood_group": patient.blood_group or (user.blood_group if user else ""),
        "village": village,
        "phone": phone,
        "phone_is_sample": not (patient.phone or (user.phone if user else None)),
        "email": user.email if user else None,
        "report_count": len(reports),
        "risk": round(risk, 1),
        "riskHistory": risk_history,
        "lastVisit": completed[0].visit_date.date().isoformat() if completed and completed[0].visit_date else "",
        "scheduledVisit": next_visit.visit_date.date().isoformat() if next_visit and next_visit.visit_date else "",
        "pendingReports": 1 if patient.user_id and len(reports) == 0 else 0,
        "followupStatus": followup,
        "flags": flags,
        "householdId": f"HH-{household_key}",
        "family_members": family_members,
        "medical_conditions": _parse_conditions(user),
        "allergies": json.loads(user.allergies) if user and user.allergies else [],
        "height_cm": user.height_cm if user else None,
        "weight_kg": user.weight_kg if user else None,
        "reports": report_summaries,
        "visits": [{
            "id": v.id,
            "date": v.visit_date.isoformat() if v.visit_date else None,
            "purpose": v.purpose,
            "status": v.status,
            "check_in_code": v.check_in_code,
            "village_name": v.village_name,
        } for v in all_visits[:10]],
    }


@router.get("/dashboard")
def get_ourhealth_dashboard(
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """Full OurHealth sync: patients, village clusters, scheduled visits."""
    patients_db = db.query(Patient).order_by(Patient.created_at.desc()).all()
    enriched = [_enrich_patient(db, p) for p in patients_db]

    villages = {}
    for p in enriched:
        vname = p["village"]
        if vname and vname not in villages:
            villages[vname] = _village_coords(vname)

    scheduled_visits = db.query(Visit).filter(Visit.status == "scheduled").order_by(Visit.visit_date.asc()).all()
    visit_queue = []
    for v in scheduled_visits:
        patient_row = None
        if v.user_id:
            patient_row = db.query(Patient).filter(Patient.user_id == v.user_id).first()
        visit_dt = v.visit_date
        overdue = False
        if visit_dt:
            cmp_dt = visit_dt.replace(tzinfo=timezone.utc) if visit_dt.tzinfo is None else visit_dt
            overdue = cmp_dt < datetime.now(timezone.utc)
        visit_queue.append({
            "id": v.id,
            "patientId": patient_row.id if patient_row else None,
            "name": v.patient_name,
            "village": v.village_name,
            "scheduledVisit": visit_dt.date().isoformat() if visit_dt else "",
            "scheduledAt": visit_dt.isoformat() if visit_dt else None,
            "purpose": v.purpose,
            "check_in_code": v.check_in_code,
            "followupStatus": "overdue" if overdue else "scheduled",
        })

    return {
        "patients": enriched,
        "villages": villages,
        "visits": visit_queue,
        "stats": {
            "patient_count": len(enriched),
            "village_count": len(villages),
            "high_risk": sum(1 for p in enriched if p["risk"] >= 60),
            "visits_due": sum(1 for v in visit_queue if v["followupStatus"] == "overdue"),
        },
    }


class ScheduleVisitBody(BaseModel):
    patient_id: int
    visit_date: datetime
    purpose: str = "Follow-up"


@router.post("/visits")
def schedule_patient_visit(
    body: ScheduleVisitBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ASHA: schedule a visit for a registered patient."""
    patient = db.query(Patient).filter(Patient.id == body.patient_id).first()
    if not patient:
        raise HTTPException(status_code=404, detail="Patient not found")

    visit = Visit(
        user_id=patient.user_id,
        patient_name=patient.name,
        village_name=patient.village or "Unassigned",
        visit_date=body.visit_date,
        purpose=body.purpose,
        status="scheduled",
        check_in_code=secrets.token_hex(4).upper(),
    )
    db.add(visit)
    db.commit()
    db.refresh(visit)
    return {
        "id": visit.id,
        "check_in_code": visit.check_in_code,
        "visit_date": visit.visit_date.isoformat() if visit.visit_date else None,
    }


@router.post("/patients")
def add_ourhealth_patient(
    patient: PatientCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_admin),
):
    """ASHA: manually register a patient in OurHealth."""
    row = Patient(**patient.model_dump())
    db.add(row)
    db.commit()
    db.refresh(row)
    return _enrich_patient(db, row)
