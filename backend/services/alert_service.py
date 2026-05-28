"""HealthMitra Scan – Emergency Alert Service"""
import re


# Critical thresholds for common medical values
CRITICAL_THRESHOLDS = {
    "hemoglobin": {"low": 7.0, "unit": "g/dL", "message_en": "Severely low hemoglobin – risk of severe anemia", "message_hi": "हीमोग्लोबिन बहुत कम – गंभीर एनीमिया का खतरा"},
    "blood_sugar_fasting": {"high": 300, "unit": "mg/dL", "message_en": "Dangerously high blood sugar – diabetic emergency", "message_hi": "ब्लड शुगर बहुत अधिक – डायबिटीज इमरजेंसी"},
    "blood_pressure_systolic": {"high": 180, "unit": "mmHg", "message_en": "Hypertensive crisis – seek emergency care", "message_hi": "बीपी बहुत ज्यादा – तुरंत अस्पताल जाएं"},
    "creatinine": {"high": 4.0, "unit": "mg/dL", "message_en": "Severe kidney dysfunction – immediate dialysis may be needed", "message_hi": "किडनी गंभीर रूप से प्रभावित – तुरंत डायलिसिस की ज़रूरत"},
    "platelet_count": {"low": 50000, "unit": "/cumm", "message_en": "Very low platelets – risk of uncontrolled bleeding", "message_hi": "प्लेटलेट बहुत कम – अनियंत्रित रक्तस्राव का खतरा"},
    "heart_rate": {"low": 40, "high": 150, "unit": "bpm", "message_en": "Abnormal heart rate – cardiac emergency", "message_hi": "असामान्य हृदय गति – हृदय आपातकाल"},
    "oxygen_saturation": {"low": 90, "unit": "%", "message_en": "Low oxygen levels – respiratory emergency", "message_hi": "ऑक्सीजन स्तर बहुत कम – श्वसन आपातकाल"},
}


def check_emergency_from_text(ocr_text: str) -> dict:
    """
    Scan OCR text for critical/dangerous medical values.
    Returns emergency alert information.
    """
    alerts = []

    # Pattern matching for common lab values
    patterns = {
        "hemoglobin": r"[Hh]emoglobin[:\s]+(\d+\.?\d*)",
        "fasting_sugar": r"[Ff]asting\s*(?:[Bb]lood\s*)?[Ss]ugar[:\s]+(\d+\.?\d*)",
        "hba1c": r"HbA1c[:\s]+(\d+\.?\d*)",
        "creatinine": r"[Cc]reatinine[:\s]+(\d+\.?\d*)",
        "systolic": r"(\d{2,3})/\d{2,3}\s*mm\s*Hg",
        "platelet": r"[Pp]latelet[:\s]+([\d,]+)",
    }

    # Check hemoglobin
    match = re.search(patterns["hemoglobin"], ocr_text)
    if match:
        val = float(match.group(1))
        if val < 7.0:
            alerts.append({
                "parameter": "Hemoglobin",
                "value": val,
                "unit": "g/dL",
                "severity": "critical",
                "message_en": f"⚠️ CRITICAL: Hemoglobin {val} g/dL is dangerously low. Risk of severe anemia. Immediate blood transfusion may be needed.",
                "message_hi": f"⚠️ गंभीर: हीमोग्लोबिन {val} g/dL बहुत कम है। गंभीर एनीमिया का खतरा। तुरंत खून चढ़ाने की ज़रूरत हो सकती है।"
            })
        elif val < 9.0:
            alerts.append({
                "parameter": "Hemoglobin",
                "value": val,
                "unit": "g/dL",
                "severity": "warning",
                "message_en": f"⚠️ WARNING: Hemoglobin {val} g/dL is low. Moderate anemia detected.",
                "message_hi": f"⚠️ चेतावनी: हीमोग्लोबिन {val} g/dL कम है। मध्यम एनीमिया।"
            })

    # Check fasting blood sugar
    match = re.search(patterns["fasting_sugar"], ocr_text)
    if match:
        val = float(match.group(1))
        if val > 300:
            alerts.append({
                "parameter": "Fasting Blood Sugar",
                "value": val,
                "unit": "mg/dL",
                "severity": "critical",
                "message_en": f"🚨 EMERGENCY: Blood sugar {val} mg/dL is dangerously high. Diabetic ketoacidosis risk. Go to hospital NOW.",
                "message_hi": f"🚨 आपातकाल: ब्लड शुगर {val} mg/dL बहुत अधिक है। तुरंत अस्पताल जाएं।"
            })
        elif val > 200:
            alerts.append({
                "parameter": "Fasting Blood Sugar",
                "value": val,
                "unit": "mg/dL",
                "severity": "warning",
                "message_en": f"⚠️ WARNING: Blood sugar {val} mg/dL indicates poorly controlled diabetes.",
                "message_hi": f"⚠️ चेतावनी: ब्लड शुगर {val} mg/dL – डायबिटीज कंट्रोल में नहीं है।"
            })

    # Check HbA1c
    match = re.search(patterns["hba1c"], ocr_text)
    if match:
        val = float(match.group(1))
        if val > 10.0:
            alerts.append({
                "parameter": "HbA1c",
                "value": val,
                "unit": "%",
                "severity": "critical",
                "message_en": f"🚨 CRITICAL: HbA1c {val}% indicates severe uncontrolled diabetes over 3 months.",
                "message_hi": f"🚨 गंभीर: HbA1c {val}% – पिछले 3 महीनों में डायबिटीज बहुत खराब।"
            })

    # Check creatinine
    match = re.search(patterns["creatinine"], ocr_text)
    if match:
        val = float(match.group(1))
        if val > 4.0:
            alerts.append({
                "parameter": "Creatinine",
                "value": val,
                "unit": "mg/dL",
                "severity": "critical",
                "message_en": f"🚨 CRITICAL: Creatinine {val} mg/dL – severe kidney failure. Dialysis may be needed.",
                "message_hi": f"🚨 गंभीर: क्रिएटिनिन {val} mg/dL – किडनी फेल्योर। डायलिसिस की ज़रूरत।"
            })
        elif val > 2.0:
            alerts.append({
                "parameter": "Creatinine",
                "value": val,
                "unit": "mg/dL",
                "severity": "warning",
                "message_en": f"⚠️ WARNING: Creatinine {val} mg/dL – kidney function impaired.",
                "message_hi": f"⚠️ चेतावनी: क्रिएटिनिन {val} mg/dL – किडनी प्रभावित।"
            })

    # Determine overall severity
    severities = [a["severity"] for a in alerts]
    if "critical" in severities:
        overall = "critical"
    elif "warning" in severities:
        overall = "warning"
    else:
        overall = "normal"

    return {
        "is_emergency": overall == "critical",
        "alerts": alerts,
        "severity": overall,
        "total_alerts": len(alerts)
    }


def check_emergency_from_vitals(vitals: dict) -> dict:
    """Check vitals directly for emergency conditions."""
    alerts = []

    bp_sys = vitals.get("blood_pressure_systolic")
    if bp_sys and bp_sys > 180:
        alerts.append({
            "parameter": "Blood Pressure",
            "value": bp_sys,
            "unit": "mmHg",
            "severity": "critical",
            "message_en": f"🚨 HYPERTENSIVE CRISIS: BP {bp_sys} mmHg. Call emergency services.",
            "message_hi": f"🚨 बीपी बहुत ज्यादा: {bp_sys} mmHg। एम्बुलेंस बुलाएं।"
        })

    sugar = vitals.get("blood_sugar_fasting")
    if sugar and sugar > 400:
        alerts.append({
            "parameter": "Blood Sugar",
            "value": sugar,
            "unit": "mg/dL",
            "severity": "critical",
            "message_en": f"🚨 DIABETIC EMERGENCY: Sugar {sugar} mg/dL. Hospital NOW.",
            "message_hi": f"🚨 शुगर इमरजेंसी: {sugar} mg/dL। तुरंत अस्पताल जाएं।"
        })

    hr = vitals.get("heart_rate")
    if hr and (hr < 40 or hr > 150):
        alerts.append({
            "parameter": "Heart Rate",
            "value": hr,
            "unit": "bpm",
            "severity": "critical",
            "message_en": f"🚨 CARDIAC ALERT: Heart rate {hr} bpm is dangerous.",
            "message_hi": f"🚨 हृदय चेतावनी: हृदय गति {hr} bpm खतरनाक है।"
        })

    severities = [a["severity"] for a in alerts]
    overall = "critical" if "critical" in severities else ("warning" if "warning" in severities else "normal")

    return {
        "is_emergency": overall == "critical",
        "alerts": alerts,
        "severity": overall,
        "total_alerts": len(alerts)
    }
