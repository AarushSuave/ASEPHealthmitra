"""HealthMitra Scan – Health Twin Router"""
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, MedicalReport, HealthTimeline
from routers.auth import get_current_user
from services.ocr_service import MEDICAL_PATTERNS
import re
import json

router = APIRouter(prefix="/api/health_twin", tags=["AI Health Twin"])


def classify_metric_risk(key: str, current) -> str:
    """Return 'at_risk' or 'stable' based on clinical thresholds."""
    try:
        if key == "blood_sugar":
            v = float(current)
            if v >= 126:
                return "at_risk"
        elif key == "blood_pressure":
            parts = str(current).replace(" ", "").split("/")
            if len(parts) == 2:
                sys_v, dia_v = int(parts[0]), int(parts[1])
                if sys_v >= 140 or dia_v >= 90 or sys_v >= 160:
                    return "at_risk"
        elif key == "cholesterol":
            if float(current) >= 200:
                return "at_risk"
        elif key == "bmi":
            if float(current) >= 25:
                return "at_risk"
        elif key == "heart_rate":
            hr = float(current)
            if hr < 50 or hr > 100:
                return "at_risk"
        elif key == "hemoglobin":
            hb = float(current)
            if hb < 12 or hb > 17:
                return "at_risk"
    except (TypeError, ValueError):
        pass
    return "stable"


def apply_risk_status(metrics: dict) -> dict:
    for key, data in metrics.items():
        has_data = bool(data.get("history"))
        if has_data and data.get("current") not in (0, "0/0", "0", None, ""):
            data["risk_status"] = classify_metric_risk(key, data["current"])
        else:
            data["risk_status"] = "unknown"
    return metrics

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

    reports_sorted = sorted(reports, key=lambda x: x.created_at or 0)

    for report in reports_sorted:
        text = (report.ocr_text or "").lower()

        for pattern_key, config in MEDICAL_PATTERNS.items():
            if pattern_key in mapping:
                dashboard_key = mapping[pattern_key]
                match = re.search(config["pattern"], text)
                if match:
                    try:
                        val = float(match.group(1).replace(",", ""))
                        metrics[dashboard_key]["history"].append(val)
                        metrics[dashboard_key]["current"] = val
                    except Exception:
                        continue

        for key, pattern in EXTENDED_PATTERNS.items():
            match = re.search(pattern, text)
            if match:
                try:
                    val = match.group(1).replace(" ", "")
                    if key == "blood_pressure":
                        metrics[key]["history"].append(val)
                        metrics[key]["current"] = val
                    else:
                        f_val = float(val)
                        metrics[key]["history"].append(f_val)
                        metrics[key]["current"] = f_val
                except Exception:
                    continue

        if report.structured_data:
            try:
                structured = json.loads(report.structured_data)
                labs = structured.get("labs") or structured.get("markers") or {}
                if isinstance(labs, dict):
                    for lab_key, lab_val in labs.items():
                        lk = str(lab_key).lower()
                        if "glucose" in lk or "sugar" in lk:
                            try:
                                v = float(str(lab_val).replace(",", ""))
                                metrics["blood_sugar"]["history"].append(v)
                                metrics["blood_sugar"]["current"] = v
                            except Exception:
                                pass
            except Exception:
                pass

    for key in metrics:
        history = metrics[key]["history"]
        if len(history) >= 2:
            last = history[-1]
            prev = history[-2]
            if key == "blood_pressure":
                try:
                    last_sys = int(str(last).split("/")[0])
                    prev_sys = int(str(prev).split("/")[0])
                    if last_sys > prev_sys:
                        metrics[key]["trend"] = "rising"
                    elif last_sys < prev_sys:
                        metrics[key]["trend"] = "falling"
                except Exception:
                    pass
            else:
                if last > prev:
                    metrics[key]["trend"] = "rising"
                elif last < prev:
                    metrics[key]["trend"] = "falling"

    return apply_risk_status(metrics)


def merge_manual_vitals(metrics, vitals_dict):
    """Overlay vitals from Risk Predictor (saved in timeline)."""
    if not vitals_dict:
        return metrics

    if vitals_dict.get("blood_sugar_fasting"):
        v = float(vitals_dict["blood_sugar_fasting"])
        metrics["blood_sugar"]["current"] = v
        if v not in metrics["blood_sugar"]["history"]:
            metrics["blood_sugar"]["history"].append(v)

    if vitals_dict.get("cholesterol_total"):
        v = float(vitals_dict["cholesterol_total"])
        metrics["cholesterol"]["current"] = v
        if v not in metrics["cholesterol"]["history"]:
            metrics["cholesterol"]["history"].append(v)

    if vitals_dict.get("heart_rate"):
        v = float(vitals_dict["heart_rate"])
        metrics["heart_rate"]["current"] = v
        if v not in metrics["heart_rate"]["history"]:
            metrics["heart_rate"]["history"].append(v)

    if vitals_dict.get("bmi"):
        v = float(vitals_dict["bmi"])
        metrics["bmi"]["current"] = v
        if v not in metrics["bmi"]["history"]:
            metrics["bmi"]["history"].append(v)

    sys_v = vitals_dict.get("blood_pressure_systolic")
    dia_v = vitals_dict.get("blood_pressure_diastolic")
    if sys_v and dia_v:
        bp = f"{int(sys_v)}/{int(dia_v)}"
        metrics["blood_pressure"]["current"] = bp
        if bp not in metrics["blood_pressure"]["history"]:
            metrics["blood_pressure"]["history"].append(bp)

    return apply_risk_status(metrics)


@router.get("/")
def get_health_twin(
    user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    reports = db.query(MedicalReport).filter(
        MedicalReport.user_id == user.id
    ).order_by(MedicalReport.created_at.desc()).all()

    latest_report = reports[0] if reports else None

    metrics = extract_vitals(reports)

    latest_vitals_entry = db.query(HealthTimeline).filter(
        HealthTimeline.user_id == user.id,
        HealthTimeline.event_type == "vitals",
    ).order_by(HealthTimeline.created_at.desc()).first()

    risk_sync = None
    if latest_vitals_entry and latest_vitals_entry.data_json:
        try:
            risk_sync = json.loads(latest_vitals_entry.data_json)
            if risk_sync.get("vitals"):
                metrics = merge_manual_vitals(metrics, risk_sync["vitals"])
        except Exception:
            risk_sync = None

    conditions = json.loads(user.medical_conditions) if user.medical_conditions else []

    height_cm = user.height_cm or (risk_sync.get("vitals", {}).get("height") if risk_sync else None)
    weight_kg = user.weight_kg or (risk_sync.get("vitals", {}).get("weight") if risk_sync else None)
    bmi_val = metrics["bmi"]["current"] or (risk_sync.get("vitals", {}).get("bmi") if risk_sync else 0)
    if (not bmi_val or bmi_val == 0) and height_cm and weight_kg:
        try:
            h_m = float(height_cm) / 100
            bmi_val = round(float(weight_kg) / (h_m * h_m), 1)
            metrics["bmi"]["current"] = bmi_val
            metrics["bmi"]["risk_status"] = classify_metric_risk("bmi", bmi_val)
        except (TypeError, ValueError):
            pass

    score = 80
    if metrics["blood_sugar"]["current"] > 100:
        score -= 10
    if metrics["blood_sugar"]["current"] > 140:
        score -= 5
    if metrics["cholesterol"]["current"] > 200:
        score -= 10
    if metrics["bmi"]["current"] > 25:
        score -= 5
    if latest_report and latest_report.risk_score and latest_report.risk_score >= 60:
        score -= 15
    elif latest_report and latest_report.risk_score and latest_report.risk_score >= 30:
        score -= 8
    if risk_sync and risk_sync.get("diabetes_risk", 0) >= 60:
        score -= 5
    if risk_sync and risk_sync.get("heart_risk", 0) >= 60:
        score -= 5
    score = max(min(score, 100), 10)

    insights = []
    if latest_report:
        insights.append({
            "type": "info",
            "text": f"Latest scan: {latest_report.filename} — risk {latest_report.risk_score or 'N/A'}% ({latest_report.risk_level or 'pending'}).",
        })

    if risk_sync:
        insights.append({
            "type": "info",
            "text": f"Risk Predictor synced: Diabetes {risk_sync.get('diabetes_risk', 0)}%, Heart {risk_sync.get('heart_risk', 0)}%.",
        })

    if metrics["blood_sugar"]["current"] > 140:
        insights.append({"type": "warning", "text": "Blood sugar results indicate hyperglycemia risk."})
    elif metrics["blood_sugar"]["trend"] == "rising":
        insights.append({"type": "info", "text": "Blood sugar trending slightly upward – monitor diet."})

    if metrics["cholesterol"]["current"] > 200:
        insights.append({"type": "warning", "text": "Cholesterol levels are above normal range."})

    if len(reports) > 0 and not any(i["type"] == "warning" for i in insights):
        insights.append({"type": "positive", "text": "Your tracked vitals are currently stable."})

    if not reports and not risk_sync:
        insights.append({"type": "info", "text": "Scan a report or run Risk Predictor to build your Health Twin."})

    return {
        "name": user.name,
        "age": user.age or 0,
        "gender": user.gender or "Unknown",
        "blood_group": user.blood_group or "-",
        "height": f"{height_cm} cm" if height_cm else "Not set",
        "weight": f"{weight_kg} kg" if weight_kg else "Not set",
        "bmi": bmi_val,
        "conditions": conditions,
        "metrics": metrics,
        "overall_health": score,
        "ai_insights": insights,
        "latest_report": {
            "filename": latest_report.filename,
            "risk_score": latest_report.risk_score,
            "risk_level": latest_report.risk_level,
            "created_at": latest_report.created_at.isoformat() if latest_report.created_at else None,
        } if latest_report else None,
        "risk_sync": {
            "diabetes_risk": risk_sync.get("diabetes_risk") if risk_sync else None,
            "diabetes_level": risk_sync.get("diabetes_level") if risk_sync else None,
            "heart_risk": risk_sync.get("heart_risk") if risk_sync else None,
            "heart_level": risk_sync.get("heart_level") if risk_sync else None,
            "combined_risk": round((risk_sync.get("diabetes_risk", 0) + risk_sync.get("heart_risk", 0)) / 2) if risk_sync else None,
            "recommendations": risk_sync.get("recommendations", []) if risk_sync else [],
        } if risk_sync else None,
        "report_count": len(reports),
    }
