import json
import logging
from typing import List, Dict, Any, Optional
from pydantic import BaseModel, Field
from datetime import datetime

logger = logging.getLogger(__name__)

# ===========================================================
# STRUCTURED JSON SCHEMA (Pydantic Models)
# ===========================================================

class MedicalParameter(BaseModel):
    section: str
    parameter: str
    value: Optional[float] = None
    unit: str
    lab_reference_range: Optional[str] = None
    guideline_reference: str
    classification_used: str
    status: str = "Incomplete Data"  # Normal | Borderline | High | Low | Incomplete
    severity: int = 0  # 0-3
    validated: bool = False

class ClinicalReport(BaseModel):
    red_flags: List[MedicalParameter] = []
    borderline: List[MedicalParameter] = []
    normal: List[MedicalParameter] = []
    incomplete: List[MedicalParameter] = []
    risk_scores: Dict[str, Any] = {}
    remedies: List[str] = []
    metadata: Dict[str, Any] = {}

# ===========================================================
# GUIDELINE THRESHOLDS (MANDATORY)
# ===========================================================

GUIDELINES = {
    "GLUCOSE": {
        "name": "Glucose (Fasting)",
        "unit": "mg/dL",
        "guideline": "ADA",
        "thresholds": [
            {"max": 100, "status": "Normal", "severity": 0, "ref": "<100"},
            {"min": 100, "max": 126, "status": "Borderline", "severity": 1, "ref": "100–125 (Prediabetic)"},
            {"min": 126, "status": "High", "severity": 2, "ref": "≥126 (Diabetic)"}
        ]
    },
    "HBA1C": {
        "name": "HbA1c",
        "unit": "%",
        "guideline": "ADA",
        "thresholds": [
            {"max": 5.7, "status": "Normal", "severity": 0, "ref": "<5.7"},
            {"min": 5.7, "max": 6.5, "status": "Borderline", "severity": 1, "ref": "5.7–6.4 (Prediabetic)"},
            {"min": 6.5, "status": "High", "severity": 2, "ref": "≥6.5 (Diabetic)"}
        ]
    },
    "TOTAL_CHOL": {
        "name": "Total Cholesterol",
        "unit": "mg/dL",
        "guideline": "ACC/AHA",
        "thresholds": [
            {"max": 200, "status": "Normal", "severity": 0, "ref": "<200 (Desirable)"},
            {"min": 200, "max": 240, "status": "Borderline", "severity": 1, "ref": "200–239 (Borderline high)"},
            {"min": 240, "status": "High", "severity": 2, "ref": "≥240 (High)"}
        ]
    },
    "LDL": {
        "name": "LDL Cholesterol",
        "unit": "mg/dL",
        "guideline": "ACC/AHA",
        "thresholds": [
            {"max": 100, "status": "Normal", "severity": 0, "ref": "<100 (Optimal)"},
            {"min": 100, "max": 130, "status": "Normal", "severity": 0, "ref": "100–129 (Near optimal)"},
            {"min": 130, "max": 160, "status": "Borderline", "severity": 1, "ref": "130–159 (Borderline high)"},
            {"min": 160, "status": "High", "severity": 2, "ref": "≥160 (High)"}
        ]
    },
    "HDL": {
        "name": "HDL Cholesterol",
        "unit": "mg/dL",
        "guideline": "ACC/AHA",
        "thresholds": {
            "male": [
                {"min": 40, "status": "Normal", "severity": 0, "ref": "≥40"},
                {"max": 40, "status": "Low", "severity": 2, "ref": "<40 (High risk)"}
            ],
            "female": [
                {"min": 50, "status": "Normal", "severity": 0, "ref": "≥50"},
                {"max": 50, "status": "Low", "severity": 2, "ref": "<50 (High risk)"}
            ]
        }
    },
    "TRIGLYCERIDES": {
        "name": "Triglycerides",
        "unit": "mg/dL",
        "guideline": "ACC/AHA",
        "thresholds": [
            {"max": 150, "status": "Normal", "severity": 0, "ref": "<150"},
            {"min": 150, "max": 200, "status": "Borderline", "severity": 1, "ref": "150–199 (Borderline)"},
            {"min": 200, "status": "High", "severity": 2, "ref": "≥200 (High)"}
        ]
    },
    "LPA": {
        "name": "Lp(a)",
        "unit": "nmol/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 72, "status": "Normal", "severity": 0, "ref": "≤72"},
            {"min": 72, "max": 125, "status": "High", "severity": 2, "ref": ">72 Elevated"},
            {"min": 125, "status": "High", "severity": 3, "ref": ">125 High risk"}
        ]
    },
    "HOMOCYSTEINE": {
        "name": "Homocysteine",
        "unit": "µmol/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 15, "status": "Normal", "severity": 0, "ref": "≤15"},
            {"min": 15, "max": 30, "status": "High", "severity": 2, "ref": ">15 Elevated"},
            {"min": 30, "status": "High", "severity": 3, "ref": ">30 Severe"}
        ]
    },
    "VITAMIN_D": {
        "name": "Vitamin D",
        "unit": "ng/mL",
        "guideline": "Endocrine Society",
        "thresholds": [
            {"min": 30, "max": 100, "status": "Normal", "severity": 0, "ref": "30–100 (Sufficient)"},
            {"min": 10, "max": 30, "status": "Low", "severity": 2, "ref": "10–30 (Insufficient)"},
            {"max": 10, "status": "Low", "severity": 3, "ref": "<10 (Deficient)"}
        ]
    },
    "EGFR": {
        "name": "eGFR",
        "unit": "mL/min/1.73m²",
        "guideline": "NKF",
        "thresholds": [
            {"min": 90, "status": "Normal", "severity": 0, "ref": "≥90 (Normal)"},
            {"min": 60, "max": 90, "status": "Borderline", "severity": 1, "ref": "60–89 (Mild decrease)"},
            {"max": 60, "status": "Low", "severity": 2, "ref": "<60 (CKD risk)"}
        ]
    },
    "TSH": {
        "name": "TSH",
        "unit": "mIU/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 0.4, "max": 4.5, "status": "Normal", "severity": 0, "ref": "0.4–4.5"},
            {"min": 4.5, "status": "High", "severity": 2, "ref": ">4.5 Elevated"},
            {"max": 0.4, "status": "Low", "severity": 2, "ref": "<0.4 Low"}
        ]
    },
    "HEMOGLOBIN": {
        "name": "Hemoglobin",
        "unit": "g/dL",
        "guideline": "WHO",
        "thresholds": {
            "male": [
                {"min": 13.0, "status": "Normal", "severity": 0, "ref": "≥13.0"},
                {"max": 13.0, "status": "Low", "severity": 2, "ref": "<13.0 (Anemia)"}
            ],
            "female": [
                {"min": 12.0, "status": "Normal", "severity": 0, "ref": "≥12.0"},
                {"max": 12.0, "status": "Low", "severity": 2, "ref": "<12.0 (Anemia)"}
            ]
        }
    },
    "RBC_COUNT": {
        "name": "RBC Count",
        "unit": "million/mm³",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 3.9, "max": 5.7, "status": "Normal", "severity": 0, "ref": "3.9–5.7"},
            {"max": 3.9, "status": "Low", "severity": 2, "ref": "<3.9 (Low RBC)"},
            {"min": 5.7, "status": "High", "severity": 2, "ref": ">5.7 (High RBC)"}
        ]
    },
    "PLATELETS": {
        "name": "Platelet Count",
        "unit": "x10³/µL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 150, "max": 450, "status": "Normal", "severity": 0, "ref": "150–450"},
            {"max": 150, "status": "Low", "severity": 2, "ref": "<150 (Thrombocytopenia)"},
            {"min": 450, "status": "High", "severity": 2, "ref": ">450 (Thrombocytosis)"}
        ]
    },
    "WBC_COUNT": {
        "name": "WBC Count",
        "unit": "/cumm",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 4000, "max": 11000, "status": "Normal", "severity": 0, "ref": "4000–11000"},
            {"max": 4000, "status": "Low", "severity": 2, "ref": "<4000 (Leukopenia)"},
            {"min": 11000, "status": "High", "severity": 2, "ref": ">11000 (Leukocytosis)"}
        ]
    },
    "ALBUMIN": {
        "name": "Albumin",
        "unit": "g/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 3.5, "max": 5.5, "status": "Normal", "severity": 0, "ref": "3.5–5.5"},
            {"max": 3.5, "status": "Low", "severity": 2, "ref": "<3.5 (Low Protein)"}
        ]
    },
    "SGPT": {
        "name": "SGPT (ALT)",
        "unit": "U/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 40, "status": "Normal", "severity": 0, "ref": "≤40"},
            {"min": 40, "max": 100, "status": "High", "severity": 1, "ref": ">40 Elevated"},
            {"min": 100, "status": "High", "severity": 2, "ref": ">100 Significant Elevation"}
        ]
    },
    "SGOT": {
        "name": "SGOT (AST)",
        "unit": "U/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 40, "status": "Normal", "severity": 0, "ref": "≤40"},
            {"min": 40, "max": 100, "status": "High", "severity": 1, "ref": ">40 Elevated"},
            {"min": 100, "status": "High", "severity": 2, "ref": ">100 Significant Elevation"}
        ]
    },
    "TOTAL_BILIRUBIN": {
        "name": "Total Bilirubin",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 1.21, "status": "Normal", "severity": 0, "ref": "≤1.2"},
            {"min": 1.21, "status": "High", "severity": 2, "ref": ">1.2 Jaundice Risk"}
        ]
    },
    "DIRECT_BILIRUBIN": {
        "name": "Direct Bilirubin",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 0.31, "status": "Normal", "severity": 0, "ref": "≤0.3"},
            {"min": 0.31, "status": "High", "severity": 2, "ref": ">0.3 Elevated"}
        ]
    },
    "INDIRECT_BILIRUBIN": {
        "name": "Indirect Bilirubin",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"max": 1.11, "status": "Normal", "severity": 0, "ref": "≤1.1"},
            {"min": 1.11, "status": "High", "severity": 2, "ref": ">1.1 Elevated"}
        ]
    },
    "UREA": {
        "name": "Blood Urea",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 15, "max": 45, "status": "Normal", "severity": 0, "ref": "15–45"},
            {"min": 45, "status": "High", "severity": 2, "ref": ">45 Elevated"}
        ]
    },
    "URIC_ACID": {
        "name": "Uric Acid",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": {
            "male": [
                {"min": 3.5, "max": 7.2, "status": "Normal", "severity": 0, "ref": "3.5–7.2"},
                {"min": 7.2, "status": "High", "severity": 2, "ref": ">7.2 (High risk for gout)"}
            ],
            "female": [
                {"min": 2.6, "max": 6.0, "status": "Normal", "severity": 0, "ref": "2.6–6.0"},
                {"min": 6.0, "status": "High", "severity": 2, "ref": ">6.0 (High risk for gout)"}
            ]
        }
    },
    "HEMATOCRIT": {
        "name": "Hematocrit (PCV)",
        "unit": "%",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 40, "max": 50, "status": "Normal", "severity": 0, "ref": "40–50%"},
            {"max": 40, "status": "Low", "severity": 2, "ref": "<40%"},
            {"min": 50, "status": "High", "severity": 2, "ref": ">50%"}
        ]
    },
    "MCV": {
        "name": "MCV",
        "unit": "fL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 80, "max": 100, "status": "Normal", "severity": 0, "ref": "80–100 fL"},
            {"max": 80, "status": "Low", "severity": 2, "ref": "<80 fL"},
            {"min": 100, "status": "High", "severity": 2, "ref": ">100 fL"}
        ]
    },
    "MCH": {
        "name": "MCH",
        "unit": "pg",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 27, "max": 32, "status": "Normal", "severity": 0, "ref": "27–32 pg"},
            {"max": 27, "status": "Low", "severity": 2, "ref": "<27 pg"},
            {"min": 32, "status": "High", "severity": 2, "ref": ">32 pg"}
        ]
    },
    "MCHC": {
        "name": "MCHC",
        "unit": "g/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 31.5, "max": 34.5, "status": "Normal", "severity": 0, "ref": "31.5–34.5 g/dL"},
            {"max": 31.5, "status": "Low", "severity": 2, "ref": "<31.5 g/dL"},
            {"min": 34.5, "status": "High", "severity": 2, "ref": ">34.5 g/dL"}
        ]
    },
    "BUN": {
        "name": "BUN",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 6, "max": 20, "status": "Normal", "severity": 0, "ref": "6–20 mg/dL"},
            {"max": 6, "status": "Low", "severity": 1, "ref": "<6 mg/dL"},
            {"min": 20, "status": "High", "severity": 2, "ref": ">20 mg/dL"}
        ]
    },
    "CREATININE": {
        "name": "Creatinine",
        "unit": "mg/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": {
            "male": [
                {"min": 0.74, "max": 1.35, "status": "Normal", "severity": 0, "ref": "0.74–1.35 mg/dL"},
                {"max": 0.74, "status": "Low", "severity": 1, "ref": "<0.74 mg/dL"},
                {"min": 1.35, "status": "High", "severity": 2, "ref": ">1.35 mg/dL"},
            ],
            "female": [
                {"min": 0.59, "max": 1.04, "status": "Normal", "severity": 0, "ref": "0.59–1.04 mg/dL"},
                {"max": 0.59, "status": "Low", "severity": 1, "ref": "<0.59 mg/dL"},
                {"min": 1.04, "status": "High", "severity": 2, "ref": ">1.04 mg/dL"},
            ],
        }
    },
    "TOTAL_PROTEIN": {
        "name": "Total Protein",
        "unit": "g/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 6.0, "max": 8.0, "status": "Normal", "severity": 0, "ref": "6.0–8.0 g/dL"},
            {"max": 6.0, "status": "Low", "severity": 2, "ref": "<6.0 g/dL"},
            {"min": 8.0, "status": "High", "severity": 2, "ref": ">8.0 g/dL"}
        ]
    },
    "GLOBULIN": {
        "name": "Globulin",
        "unit": "g/dL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 2.3, "max": 3.5, "status": "Normal", "severity": 0, "ref": "2.3–3.5 g/dL"},
            {"max": 2.3, "status": "Low", "severity": 2, "ref": "<2.3 g/dL"},
            {"min": 3.5, "status": "High", "severity": 2, "ref": ">3.5 g/dL"}
        ]
    },
    "VITAMIN_B12": {
        "name": "Vitamin B12",
        "unit": "pg/mL",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 197, "max": 771, "status": "Normal", "severity": 0, "ref": "197–771 pg/mL"},
            {"max": 197, "status": "Low", "severity": 2, "ref": "<197 (Deficient)"},
            {"min": 771, "status": "High", "severity": 1, "ref": ">771 (Elevated)"}
        ]
    },
    "ALP": {
        "name": "ALP",
        "unit": "U/L",
        "guideline": "Clinical Recommendation",
        "thresholds": [
            {"min": 40, "max": 130, "status": "Normal", "severity": 0, "ref": "40–130 U/L"},
            {"max": 40, "status": "Low", "severity": 1, "ref": "<40 U/L"},
            {"min": 130, "status": "High", "severity": 2, "ref": ">130 U/L"}
        ]
    }
}

# ===========================================================
# HELPER UTILITIES
# ===========================================================

def normalize_parameter_name(s: str) -> str:
    """Normalize parameter names for robust matching."""
    if not s: return ""
    # Remove common suffixes found in OCR
    s = s.lower()
    for suffix in [", serum", " serum", ", edta plasma", " edta plasma", "/"]:
        s = s.replace(suffix, "")
    
    # Remove all non-alphanumeric characters
    return "".join(c for c in s if c.isalnum())


# ===========================================================
# DETERMINISTIC RULE ENGINE
# ===========================================================

def classify_parameter(param_key: str, value: float, gender: str = "male") -> Dict[str, Any]:
    """Classify a single medical parameter based on guidelines."""
    if param_key not in GUIDELINES:
        return {"status": "Unknown Parameter", "severity": 0, "ref": "N/A", "guideline": "N/A"}
    
    g = (gender or "male").lower()
    if g not in ("male", "female"):
        g = "male"
    
    config = GUIDELINES[param_key]
    thresholds = config["thresholds"]
    
    # Handle gender-specific thresholds
    if isinstance(thresholds, dict):
        thresholds = thresholds.get(g, thresholds.get("male"))
        
    for t in thresholds:
        match = True
        if "min" in t and value < t["min"]:
            match = False
        if "max" in t and value >= t["max"]:
            match = False
            
        if match:
            return {
                "status": t["status"],
                "severity": t["severity"],
                "ref": t["ref"],
                "guideline": config["guideline"]
            }
            
    return {"status": "Unknown", "severity": 0, "ref": "N/A", "guideline": "N/A"}

# ===========================================================
# RISK SCORING ENGINE
# ===========================================================

def calculate_cv_risk(params: List[MedicalParameter], gender: str = "male") -> Dict[str, Any]:
    """
    Calculate Cardiovascular Risk Score from available lab markers.
    Scores proportionally based on how many markers were extracted (partial vitals OK).
    """
    g = (gender or "male").lower()
    if g not in ("male", "female"):
        g = "male"
    hdl_cutoff = 50 if g == "female" else 40

    marker_rules = {
        "LDL Cholesterol": [
            (160, 30), (130, 15),
        ],
        "HDL Cholesterol": [
            (hdl_cutoff, 20, "below"),
        ],
        "Triglycerides": [
            (200, 15), (150, 5),
        ],
        "lpa": [
            (125, 20), (72, 10),
        ],
        "Homocysteine": [
            (30, 15), (15, 5),
        ],
        "Fasting Blood Sugar": [
            (126, 25), (100, 12),
        ],
        "Hemoglobin": [
            (17, 10, "above"), (12, 10, "below"),
        ],
        "Total Cholesterol": [
            (240, 20), (200, 10),
        ],
    }

    available = {
        normalize_parameter_name(p.parameter): p.value
        for p in params if p.validated and p.value is not None
    }

    score = 0
    max_score = 0
    measured = []
    missing = []

    for marker, rules in marker_rules.items():
        key = normalize_parameter_name(marker)
        if key not in available:
            missing.append(marker)
            continue
        val = available[key]
        measured.append(marker)
        for rule in rules:
            threshold, points = rule[0], rule[1]
            direction = rule[2] if len(rule) > 2 else "above"
            max_score += points
            if direction == "below":
                if val < threshold:
                    score += points
            elif direction == "above":
                if val > threshold:
                    score += points
            else:
                if val > threshold:
                    score += points

    if not measured:
        return {
            "status": "Unavailable",
            "score": None,
            "level": "Unknown",
            "message": "No lab markers detected – upload a clearer report",
            "missing": list(marker_rules.keys()),
            "measured": [],
        }

    pct = min(max(int(round(score / max_score * 100)), 5), 95) if max_score else 5
    if pct >= 60:
        risk_level = "High"
    elif pct >= 30:
        risk_level = "Moderate"
    else:
        risk_level = "Low"

    return {
        "status": "Calculated",
        "score": pct,
        "level": risk_level,
        "message": f"Based on {len(measured)} marker(s)",
        "missing": missing,
        "measured": measured,
    }

# ===========================================================
# SUGGESTED REMEDIES ENGINE
# ===========================================================

def get_suggested_remedies(report: ClinicalReport) -> List[str]:
    """Generate lifestyle-only remedies based on abnormal markers."""
    remedies = set()
    
    all_abnormal = report.red_flags + report.borderline
    if not all_abnormal:
        return ["No abnormal parameters detected."]
        
    for p in all_abnormal:
        if "Glucose" in p.parameter or "HbA1c" in p.parameter:
            remedies.add("Reduce intake of refined sugars and processed carbohydrates.")
            remedies.add("Prioritize high-fiber foods like whole grains, vegetables, and legumes.")
            remedies.add("Engage in at least 30 minutes of brisk walking daily.")
        elif "Cholesterol" in p.parameter or "LDL" in p.parameter or "Triglycerides" in p.parameter:
            remedies.add("Limit saturated and trans fats (e.g., deep-fried foods, butter).")
            remedies.add("Increase intake of heart-healthy fats (omega-3) found in flaxseeds or walnuts.")
            remedies.add("Incorporate aerobic exercise (cycling, swimming) 5 times a week.")
        elif "Vitamin D" in p.parameter:
            remedies.add("Increase safe sunlight exposure (15-20 minutes daily in mid-morning).")
            remedies.add("Consume Vitamin D rich foods like fatty fish or fortified cereals.")
        elif "eGFR" in p.parameter or "Urea" in p.parameter or "Creatinine" in p.parameter:
            remedies.add("Maintain adequate hydration (2-3 liters of water daily).")
            remedies.add("Monitor daily salt intake and avoid excessive protein consumption.")
            remedies.add("Avoid over-the-counter painkillers (NSAIDs) without clinical advice.")
        elif "Hemoglobin" in p.parameter or "RBC" in p.parameter:
            remedies.add("Increase intake of iron-rich foods like spinach, lentils, and pomegranate.")
            remedies.add("Consume Vitamin C rich foods (citrus fruits) to enhance iron absorption.")
        elif "SGPT" in p.parameter or "SGOT" in p.parameter or "Bilirubin" in p.parameter:
            remedies.add("Avoid alcohol consumption and limit highly processed/oily foods.")
            remedies.add("Incorporate liver-friendly foods like green leafy vegetables and turmeric.")
        elif "Uric Acid" in p.parameter:
            remedies.add("Limit intake of purine-rich foods like red meat and certain seafood.")
            remedies.add("Stay well-hydrated to help kidneys flush out uric acid.")
            
    # Universal remedies
    remedies.add("Discuss these results with your primary care physician for a formal diagnosis.")
    remedies.add("Ensure 7-8 hours of quality sleep for metabolic recovery.")
    
    return list(remedies)

# ===========================================================
# CORE ENGINE ENTRY POINT
# ===========================================================

def process_clinical_results(parsed_data: List[Dict[str, Any]], patient_context: Dict[str, Any] = {}) -> ClinicalReport:
    """Main pipeline for deterministic CDSS engine."""
    report = ClinicalReport()
    gender = patient_context.get("gender", "male")
    
    # Mapping structured output to GUIDELINES keys
    KEY_MAP = {
        "Fasting Blood Sugar": "GLUCOSE",
        "HbA1c": "HBA1C",
        "Total Cholesterol": "TOTAL_CHOL",
        "LDL Cholesterol": "LDL",
        "HDL Cholesterol": "HDL",
        "Triglycerides": "TRIGLYCERIDES",
        "Lp(a)": "LPA",
        "Lipoprotein (a)": "LPA",
        "lipoproteina": "LPA",
        "lpa": "LPA",
        "Homocysteine": "HOMOCYSTEINE",
        "Vitamin D": "VITAMIN_D",
        "eGFR": "EGFR",
        "TSH": "TSH",
        "Hemoglobin": "HEMOGLOBIN",
        "RBC Count": "RBC_COUNT",
        "Platelet Count": "PLATELETS",
        "WBC": "WBC_COUNT",
        "Albumin": "ALBUMIN",
        "SGPT": "SGPT",
        "SGOT": "SGOT",
        "Total Bilirubin": "TOTAL_BILIRUBIN",
        "Direct Bilirubin": "DIRECT_BILIRUBIN",
        "Indirect Bilirubin": "INDIRECT_BILIRUBIN",
        "Urea": "UREA",
        "Uric Acid": "URIC_ACID",
        "Hematocrit": "HEMATOCRIT",
        "MCV": "MCV",
        "MCH": "MCH",
        "MCHC": "MCHC",
        "ALP": "ALP",
        "BUN": "BUN",
        "Creatinine": "CREATININE",
        "Total Protein": "TOTAL_PROTEIN",
        "Globulin": "GLOBULIN",
        "Vitamin B12": "VITAMIN_B12"
    }

    # Normalized KEY_MAP for robust lookup
    NORM_KEY_MAP = {normalize_parameter_name(k): v for k, v in KEY_MAP.items()}

    processed_params = []

    for item in parsed_data:
        param_name = item.get("parameter")
        param_key = NORM_KEY_MAP.get(normalize_parameter_name(param_name))
        value = item.get("value")
        
        if value is None or param_key is None:
            # Incomplete or unknown
            p = MedicalParameter(
                section=item.get("section", "General"),
                parameter=param_name,
                value=value,
                unit=item.get("unit", "N/A"),
                lab_reference_range=item.get("lab_reference_range"),
                guideline_reference="N/A",
                classification_used="N/A",
                status="Incomplete Data",
                severity=0,
                validated=False
            )
            report.incomplete.append(p)
            processed_params.append(p)
            continue
            
        # Deterministic Classification
        classification = classify_parameter(param_key, value, gender)
        
        p = MedicalParameter(
            section=item.get("section", "General"),
            parameter=param_name,
            value=value,
            unit=item.get("unit", GUIDELINES[param_key]["unit"]),
            lab_reference_range=item.get("lab_reference_range"),
            guideline_reference=classification["ref"],
            classification_used=classification["guideline"],
            status=classification["status"],
            severity=classification["severity"],
            validated=True
        )
        
        # Categorize for UI
        if p.severity >= 2:
            report.red_flags.append(p)
        elif p.severity == 1:
            report.borderline.append(p)
        else:
            report.normal.append(p)
            
        processed_params.append(p)

    # Risk Scoring
    g = (gender or "male").lower()
    if g not in ("male", "female"):
        g = "male"
    report.risk_scores["cardiovascular"] = calculate_cv_risk(processed_params, g)
    
    # Multimarker Escalation
    if len([p for p in report.red_flags if "Cholesterol" in p.parameter or "LDL" in p.parameter]) >= 2:
        report.metadata["pattern_alert"] = "Elevated Cardiovascular Risk Pattern"

    # Remedies
    report.remedies = get_suggested_remedies(report)
    
    return report
