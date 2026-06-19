"""HealthMitra Scan – Risk Engine (Rule-based, partial-vitals scoring)"""
from services.vitals_thresholds import (
    VITAL_BASELINES,
    bmi_risk_points,
    classify_bmi,
    is_vital_provided,
)


def _normalize_gender(gender: str) -> str:
    return (gender or "male").strip().lower()


def _risk_level(score: float) -> str:
    return "low" if score < 30 else ("moderate" if score < 60 else "high")


def _finalize(score: int, max_score: int, recommendations: list) -> tuple[float, str, list]:
    if max_score <= 0:
        return 5.0, "low", ["Enter at least one vital to estimate risk"]
    pct = min(max(int(round(score / max_score * 100)), 5), 95)
    if not recommendations:
        recommendations.append("✅ Good health indicators – maintain your healthy lifestyle")
    return float(pct), _risk_level(pct), recommendations


def calculate_diabetes_risk(vitals: dict) -> tuple[float, str, list]:
    score = 0
    max_score = 0
    recommendations = []
    bl = VITAL_BASELINES

    age = vitals.get("age")
    if is_vital_provided(age):
        max_score += 15
        if age > bl["age"]["high_max"]:
            score += 15
        elif age > bl["age"]["elevated_max"]:
            score += 12
        elif age > bl["age"]["normal_max"]:
            score += 8

    bmi = vitals.get("bmi")
    if is_vital_provided(bmi):
        pts, mx = bmi_risk_points(bmi)
        max_score += mx
        score += pts
        cat = classify_bmi(bmi)
        if cat == "underweight":
            recommendations.append("⚖️ BMI below 18.5 – consult a doctor about healthy weight gain")
        elif cat == "overweight":
            recommendations.append("⚖️ Aim for healthy BMI (18.5–24.9) through diet and exercise")
        elif cat == "obese":
            recommendations.append("🏃 Reduce weight – BMI above 30 significantly increases diabetes risk")

    fasting_sugar = vitals.get("blood_sugar_fasting")
    if is_vital_provided(fasting_sugar):
        max_score += 30
        if fasting_sugar >= bl["blood_sugar_fasting"]["diabetic"]:
            score += 30
            recommendations.append("🩸 Fasting sugar ≥126 indicates diabetes – consult doctor immediately")
        elif fasting_sugar > bl["blood_sugar_fasting"]["normal_max"]:
            score += 18
            recommendations.append("⚠️ Pre-diabetic range – reduce sugar and refined carbs intake")

    if vitals.get("family_history_diabetes"):
        max_score += 15
        score += 15
        recommendations.append("👨‍👩‍👧 Family history increases risk – get annual HbA1c test")

    if vitals.get("smoking"):
        max_score += 5
        score += 5
        recommendations.append("🚭 Quit smoking – it worsens insulin resistance")

    exercise = vitals.get("exercise_minutes_weekly", 0)
    if is_vital_provided(exercise):
        max_score += 10
        if exercise < bl["exercise_minutes_weekly"]["minimum"]:
            score += 10
            recommendations.append("🏋️ Exercise at least 150 minutes/week to reduce diabetes risk")
        elif exercise < bl["exercise_minutes_weekly"]["recommended"]:
            score += 5

    return _finalize(score, max_score, recommendations)


def calculate_heart_risk(vitals: dict) -> tuple[float, str, list]:
    score = 0
    max_score = 0
    recommendations = []
    bl = VITAL_BASELINES
    gender = _normalize_gender(vitals.get("gender"))

    age = vitals.get("age")
    if is_vital_provided(age):
        max_score += 12
        if gender == "male" and age > 45:
            score += 12
        elif gender == "female" and age > 55:
            score += 12
        elif age > 35:
            score += 5

    systolic = vitals.get("blood_pressure_systolic")
    if is_vital_provided(systolic):
        max_score += 22
        if systolic >= bl["blood_pressure_systolic"]["high_max"]:
            score += 22
            recommendations.append("🫀 Blood pressure very high – take prescribed BP medication regularly")
        elif systolic >= bl["blood_pressure_systolic"]["elevated_max"]:
            score += 12
            recommendations.append("💊 Elevated blood pressure – reduce salt intake and monitor regularly")

    diastolic = vitals.get("blood_pressure_diastolic")
    if is_vital_provided(diastolic):
        max_score += 10
        if diastolic >= bl["blood_pressure_diastolic"]["elevated_max"]:
            score += 10

    cholesterol = vitals.get("cholesterol_total")
    if is_vital_provided(cholesterol):
        max_score += 20
        if cholesterol >= bl["cholesterol_total"]["borderline_max"]:
            score += 20
            recommendations.append("🧈 Very high cholesterol – avoid fried foods, start statin if prescribed")
        elif cholesterol > bl["cholesterol_total"]["normal_max"]:
            score += 10
            recommendations.append("🥗 Cholesterol elevated – increase fiber, reduce saturated fats")

    heart_rate = vitals.get("heart_rate")
    if is_vital_provided(heart_rate):
        max_score += 8
        if heart_rate > bl["heart_rate"]["normal_max"]:
            score += 8
            recommendations.append("💓 Resting heart rate is high – practice deep breathing and meditation")
        elif heart_rate < bl["heart_rate"]["low_min"]:
            score += 5

    if vitals.get("smoking"):
        max_score += 15
        score += 15
        recommendations.append("🚭 Smoking doubles heart disease risk – seek help to quit")

    if vitals.get("family_history_heart"):
        max_score += 12
        score += 12
        recommendations.append("👨‍👩‍👧 Family history of heart disease – get annual cardiac checkup")

    bmi = vitals.get("bmi")
    if is_vital_provided(bmi):
        pts, mx = bmi_risk_points(bmi)
        max_score += min(mx, 10)
        score += min(pts, 10)

    exercise = vitals.get("exercise_minutes_weekly", 0)
    if is_vital_provided(exercise):
        max_score += 8
        if exercise < bl["exercise_minutes_weekly"]["minimum"]:
            score += 8
            recommendations.append("🚶 Regular walking 30 mins/day significantly reduces heart risk")

    return _finalize(score, max_score, recommendations)


def predict_risks(vitals: dict) -> dict:
    """Calculate all health risks from whatever vitals were provided."""
    vitals = {**vitals, "gender": _normalize_gender(vitals.get("gender"))}
    diabetes_risk, diabetes_level, diabetes_recs = calculate_diabetes_risk(vitals)
    heart_risk, heart_level, heart_recs = calculate_heart_risk(vitals)

    return {
        "diabetes_risk": diabetes_risk,
        "diabetes_level": diabetes_level,
        "heart_risk": heart_risk,
        "heart_level": heart_level,
        "recommendations": list(dict.fromkeys(diabetes_recs + heart_recs)),
        "bmi_category": classify_bmi(vitals.get("bmi") or 0),
        "vitals_provided": sum(
            1 for k in (
                "age", "bmi", "blood_pressure_systolic", "blood_pressure_diastolic",
                "blood_sugar_fasting", "cholesterol_total", "heart_rate",
            ) if is_vital_provided(vitals.get(k))
        ),
    }
