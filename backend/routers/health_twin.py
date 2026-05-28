"""HealthMitra Scan – Health Twin Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalReport
from services.ocr_service import MEDICAL_PATTERNS
import re
import json

router = APIRouter(prefix="/api/health_twin", tags=["AI Health Twin"])

# Additional patterns specifically for the dashboard/health twin if not in general OCR
EXTENDED_PATTERNS = {
    "blood_pressure": r"(?:blood\s*pressure|bp)\s*[:\-]?\s*(\d{2,3}[/\s]+\d{2,3})",
    "heart_rate": r"(?:heart\s*rate|pulse|bpm)\s*[:\-]?\s*(\d{2,3})",
    "bmi": r"(?:bmi|body\s*mass\s*index)\s*[:\-]?\s*([\d.]+)",
}

def extract_vitals(reports):
    metrics = {
        "blood_sugar": {"current": 0, "trend": "stable", "history": []},
        "blood_pressure": {"current": "0/0", "trend": "stable", "history": []},
        "cholesterol": {"current": 0, "trend": "stable", "history": []},
        "hemoglobin": {"current": 0, "trend": "stable", "history": []},
        "heart_rate": {"current": 0, "trend": "stable", "history": []},
        "bmi": {"current": 0, "trend": "stable", "history": []},
    }
    
    mapping = {
        "fasting_blood_sugar": "blood_sugar",
        "total_cholesterol": "cholesterol",
        "hemoglobin": "hemoglobin",
    }
    
    # Process reports in chronological order
    reports_sorted = sorted(reports, key=lambda x: x.created_at)
    
    for report in reports_sorted:
        text = report.ocr_text.lower()
        
        # 1. Parse standard patterns
        for pattern_key, config in MEDICAL_PATTERNS.items():
            if pattern_key in mapping:
                dashboard_key = mapping[pattern_key]
                match = re.search(config["pattern"], text)
                if match:
                    try:
                        val = float(match.group(1).replace(",", ""))
                        metrics[dashboard_key]["history"].append(val)
                        metrics[dashboard_key]["current"] = val
                    except:
                        continue
        
        # 2. Parse extended patterns
        for key, pattern in EXTENDED_PATTERNS.items():
            match = re.search(pattern, text)
            if match:
                try:
                    val = match.group(1).replace(" ", "")
                    if key == "blood_pressure":
                        metrics[key]["history"].append(val) # For history we might need something else but for now...
                        metrics[key]["current"] = val
                    else:
                        f_val = float(val)
                        metrics[key]["history"].append(f_val)
                        metrics[key]["current"] = f_val
                except:
                    continue

    # Calculate trends (simplistic: compare last two)
    for key in metrics:
        history = metrics[key]["history"]
        if len(history) >= 2:
            last = history[-1]
            prev = history[-2]
            
            # Special handling for blood pressure trend (just compare systolic)
            if key == "blood_pressure":
                try:
                    last_sys = int(last.split('/')[0])
                    prev_sys = int(prev.split('/')[0])
                    if last_sys > prev_sys: metrics[key]["trend"] = "rising"
                    elif last_sys < prev_sys: metrics[key]["trend"] = "falling"
                except: pass
            else:
                if last > prev: metrics[key]["trend"] = "rising"
                elif last < prev: metrics[key]["trend"] = "falling"
    
    return metrics

@router.get("/")
def get_health_twin(db: Session = Depends(get_db)):
    # Get the primary user (the one we are studying)
    user = db.query(User).first()
    if not user:
        # Fallback for demo if no user exists yet
        return {
            "name": "Guest User",
            "age": 0,
            "gender": "Unknown",
            "blood_group": "-",
            "height": "0 cm",
            "weight": "0 kg",
            "bmi": 0,
            "conditions": [],
            "metrics": {
                "blood_sugar": {"current": 0, "trend": "stable", "history": []},
                "blood_pressure": {"current": "0/0", "trend": "stable", "history": []},
                "cholesterol": {"current": 0, "trend": "stable", "history": []},
                "hemoglobin": {"current": 0, "trend": "stable", "history": []},
                "heart_rate": {"current": 0, "trend": "stable", "history": []},
                "bmi": {"current": 0, "trend": "stable", "history": []},
            },
            "overall_health": 0,
            "ai_insights": [{"type": "info", "text": "No health data available. Upload a medical report to start monitoring."}]
        }
    
    reports = db.query(MedicalReport).all()
    metrics = extract_vitals(reports)
    
    conditions = json.loads(user.medical_conditions) if user.medical_conditions else []
    
    # Calculate overall health score (simplistic weighted average)
    score = 80
    if metrics["blood_sugar"]["current"] > 100: score -= 10
    if metrics["cholesterol"]["current"] > 200: score -= 10
    if metrics["bmi"]["current"] > 25: score -= 5
    score = max(min(score, 100), 10)

    # Generate AI insights (to be eventually replaced by LLM)
    insights = []
    if metrics["blood_sugar"]["current"] > 140:
        insights.append({"type": "warning", "text": "Blood sugar results indicate hyperglycemia risk."})
    elif metrics["blood_sugar"]["trend"] == "rising":
        insights.append({"type": "info", "text": "Blood sugar trending slightly upward – monitor diet."})
        
    if metrics["cholesterol"]["current"] > 200:
        insights.append({"type": "warning", "text": "Cholesterol levels are above normal range."})
    
    if len(reports) > 0 and not insights:
        insights.append({"type": "positive", "text": "Your vital parameters are currently stable."})
    
    if not reports:
        insights.append({"type": "info", "text": "Start by uploading your first medical report."})

    return {
        "name": user.name,
        "age": user.age,
        "gender": user.gender,
        "blood_group": user.blood_group,
        "height": "Not set",
        "weight": "Not set",
        "bmi": metrics["bmi"]["current"] if metrics["bmi"]["current"] > 0 else 0,
        "conditions": conditions,
        "metrics": metrics,
        "overall_health": score,
        "ai_insights": insights
    }
