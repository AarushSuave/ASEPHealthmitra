"""HealthMitra Scan – Risk Predictor Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import HealthTimeline
from schemas import VitalsInput
from services.risk_engine import predict_risks
from services.alert_service import check_emergency_from_vitals
import json

router = APIRouter(prefix="/api/risk", tags=["Risk Predictor"])


@router.post("/predict")
def predict_risk(vitals: VitalsInput, patient_id: int = None, db: Session = Depends(get_db)):
    """Predict diabetes and heart disease risk based on vitals."""
    vitals_dict = vitals.model_dump()
    result = predict_risks(vitals_dict)
    emergency = check_emergency_from_vitals(vitals_dict)

    # Save to timeline
    if patient_id:
        timeline_entry = HealthTimeline(
            patient_id=patient_id,
            event_type="vitals",
            title="Health Risk Assessment",
            description=f"Diabetes: {result['diabetes_risk']}% | Heart: {result['heart_risk']}%",
            risk_score=(result["diabetes_risk"] + result["heart_risk"]) / 2,
            data_json=json.dumps(result)
        )
        db.add(timeline_entry)
        db.commit()

    return {
        **result,
        "emergency": emergency
    }
