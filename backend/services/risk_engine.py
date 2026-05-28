"""HealthMitra Scan – Risk Engine (Rule-based Prediction)"""


def calculate_diabetes_risk(vitals: dict) -> tuple[float, str, list]:
    """
    Calculate diabetes risk based on vitals using rule-based scoring.
    Returns (risk_percentage, risk_level, recommendations)
    """
    score = 0
    recommendations = []

    age = vitals.get("age", 30)
    if age > 45:
        score += 15
    elif age > 35:
        score += 8

    bmi = vitals.get("bmi", 22)
    if bmi and bmi > 30:
        score += 20
        recommendations.append("🏃 Reduce weight – BMI above 30 significantly increases diabetes risk")
    elif bmi and bmi > 25:
        score += 12
        recommendations.append("⚖️ Aim for healthy BMI (18.5-24.9) through diet and exercise")

    fasting_sugar = vitals.get("blood_sugar_fasting", 90)
    if fasting_sugar and fasting_sugar > 126:
        score += 30
        recommendations.append("🩸 Fasting sugar >126 indicates diabetes – consult doctor immediately")
    elif fasting_sugar and fasting_sugar > 100:
        score += 18
        recommendations.append("⚠️ Pre-diabetic range – reduce sugar and refined carbs intake")

    if vitals.get("family_history_diabetes", False):
        score += 15
        recommendations.append("👨‍👩‍👧 Family history increases risk – get annual HbA1c test")

    if vitals.get("smoking", False):
        score += 5
        recommendations.append("🚭 Quit smoking – it worsens insulin resistance")

    exercise = vitals.get("exercise_minutes_weekly", 0)
    if exercise < 60:
        score += 10
        recommendations.append("🏋️ Exercise at least 150 minutes/week to reduce diabetes risk")
    elif exercise < 150:
        score += 5

    # Normalize to 0-100
    risk = min(max(score, 5), 95)
    level = "low" if risk < 30 else ("moderate" if risk < 60 else "high")

    if not recommendations:
        recommendations.append("✅ Good health indicators – maintain your healthy lifestyle")

    return risk, level, recommendations


def calculate_heart_risk(vitals: dict) -> tuple[float, str, list]:
    """
    Calculate cardiovascular risk based on vitals using rule-based scoring.
    Returns (risk_percentage, risk_level, recommendations)
    """
    score = 0
    recommendations = []

    age = vitals.get("age", 30)
    gender = vitals.get("gender", "male")
    if gender == "male" and age > 45:
        score += 12
    elif gender == "female" and age > 55:
        score += 12
    elif age > 35:
        score += 5

    systolic = vitals.get("blood_pressure_systolic", 120)
    diastolic = vitals.get("blood_pressure_diastolic", 80)
    if systolic and systolic > 140:
        score += 22
        recommendations.append("🫀 Blood pressure very high – take prescribed BP medication regularly")
    elif systolic and systolic > 130:
        score += 12
        recommendations.append("💊 Elevated blood pressure – reduce salt intake and monitor regularly")

    if diastolic and diastolic > 90:
        score += 10

    cholesterol = vitals.get("cholesterol_total", 180)
    if cholesterol and cholesterol > 240:
        score += 20
        recommendations.append("🧈 Very high cholesterol – avoid fried foods, start statin if prescribed")
    elif cholesterol and cholesterol > 200:
        score += 10
        recommendations.append("🥗 Cholesterol elevated – increase fiber, reduce saturated fats")

    heart_rate = vitals.get("heart_rate", 72)
    if heart_rate and heart_rate > 100:
        score += 8
        recommendations.append("💓 Resting heart rate is high – practice deep breathing and meditation")

    if vitals.get("smoking", False):
        score += 15
        recommendations.append("🚭 Smoking doubles heart disease risk – seek help to quit")

    if vitals.get("family_history_heart", False):
        score += 12
        recommendations.append("👨‍👩‍👧 Family history of heart disease – get annual cardiac checkup")

    bmi = vitals.get("bmi", 22)
    if bmi and bmi > 30:
        score += 10

    exercise = vitals.get("exercise_minutes_weekly", 0)
    if exercise < 60:
        score += 8
        recommendations.append("🚶 Regular walking 30 mins/day significantly reduces heart risk")

    # Normalize to 0-100
    risk = min(max(score, 5), 95)
    level = "low" if risk < 30 else ("moderate" if risk < 60 else "high")

    if not recommendations:
        recommendations.append("✅ Heart health looks good – keep up the healthy habits")

    return risk, level, recommendations


def predict_risks(vitals: dict) -> dict:
    """Calculate all health risks from vitals."""
    diabetes_risk, diabetes_level, diabetes_recs = calculate_diabetes_risk(vitals)
    heart_risk, heart_level, heart_recs = calculate_heart_risk(vitals)

    return {
        "diabetes_risk": diabetes_risk,
        "diabetes_level": diabetes_level,
        "heart_risk": heart_risk,
        "heart_level": heart_level,
        "recommendations": list(set(diabetes_recs + heart_recs))
    }
