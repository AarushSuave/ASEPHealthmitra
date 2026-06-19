"""Shared clinical baseline thresholds for vitals and BMI classification."""

# WHO BMI categories
BMI_UNDERWEIGHT = 18.5
BMI_NORMAL_MAX = 24.9
BMI_OVERWEIGHT = 25.0
BMI_OBESE = 30.0

# Baseline thresholds for manual vitals (used in risk scoring)
VITAL_BASELINES = {
    "age": {"normal_max": 35, "elevated_max": 45, "high_max": 55},
    "bmi": {"underweight": BMI_UNDERWEIGHT, "normal_max": BMI_NORMAL_MAX, "overweight": BMI_OVERWEIGHT, "obese": BMI_OBESE},
    "blood_pressure_systolic": {"normal_max": 120, "elevated_max": 130, "high_max": 140, "critical": 180},
    "blood_pressure_diastolic": {"normal_max": 80, "elevated_max": 90, "high_max": 100},
    "blood_sugar_fasting": {"normal_max": 100, "prediabetic_max": 126, "diabetic": 126},
    "cholesterol_total": {"normal_max": 200, "borderline_max": 240},
    "heart_rate": {"low_min": 60, "normal_max": 100, "high_max": 120},
    "exercise_minutes_weekly": {"recommended": 150, "minimum": 60},
}


def classify_bmi(bmi: float) -> str:
    """Return WHO BMI category label."""
    if not bmi or bmi <= 0:
        return "unknown"
    if bmi < BMI_UNDERWEIGHT:
        return "underweight"
    if bmi <= BMI_NORMAL_MAX:
        return "normal"
    if bmi < BMI_OBESE:
        return "overweight"
    return "obese"


def bmi_risk_points(bmi: float) -> tuple[int, int]:
    """Return (score_points, max_points) for BMI contribution."""
    if not bmi or bmi <= 0:
        return 0, 0
    if bmi < BMI_UNDERWEIGHT:
        return 8, 20
    if bmi <= BMI_NORMAL_MAX:
        return 0, 20
    if bmi < BMI_OBESE:
        return 12, 20
    return 20, 20


def is_vital_provided(value) -> bool:
    """True when user entered a meaningful vital value."""
    if value is None:
        return False
    if isinstance(value, bool):
        return True
    if isinstance(value, (int, float)):
        return value > 0
    if isinstance(value, str):
        return bool(value.strip())
    return bool(value)
