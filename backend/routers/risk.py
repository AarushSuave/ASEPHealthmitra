"""HealthMitra Scan – Risk Predictor Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import HealthTimeline
from services.patient_sync import ensure_patient_for_user
from schemas import VitalsInput
from services.risk_engine import predict_risks
from services.alert_service import check_emergency_from_vitals
from routers.auth import get_optional_user
import json

router = APIRouter(prefix="/api/risk", tags=["Risk Predictor"])


@router.post("/predict")
def predict_risk(
    vitals: VitalsInput,
    patient_id: int = None,
    db: Session = Depends(get_db),
    current_user=Depends(get_optional_user),
):
    """Predict diabetes and heart disease risk based on vitals."""
    vitals_dict = vitals.model_dump()
    result = predict_risks(vitals_dict)
    emergency = check_emergency_from_vitals(vitals_dict)

    combined = round((result["diabetes_risk"] + result["heart_risk"]) / 2)
    payload = {**result, "vitals": vitals_dict, "combined_risk": combined}

    if current_user:
        if vitals_dict.get("height"):
            current_user.height_cm = float(vitals_dict["height"])
        if vitals_dict.get("weight"):
            current_user.weight_kg = float(vitals_dict["weight"])
        patient = ensure_patient_for_user(db, current_user)
        timeline_entry = HealthTimeline(
            user_id=current_user.id,
            patient_id=patient.id,
            event_type="vitals",
            title="Health Risk Assessment",
            description=f"Diabetes: {result['diabetes_risk']}% | Heart: {result['heart_risk']}%",
            risk_score=combined,
            data_json=json.dumps(payload),
        )
        db.add(timeline_entry)
        db.commit()
    elif patient_id:
        timeline_entry = HealthTimeline(
            patient_id=patient_id,
            event_type="vitals",
            title="Health Risk Assessment",
            description=f"Diabetes: {result['diabetes_risk']}% | Heart: {result['heart_risk']}%",
            risk_score=combined,
            data_json=json.dumps(payload),
        )
        db.add(timeline_entry)
        db.commit()

    return {
        **result,
        "combined_risk": combined,
        "emergency": emergency,
    }
