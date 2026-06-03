"""Seed ~20 demo patients for development and OurHealth demos."""
import json
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy.orm import Session

from models import User, Patient, MedicalReport, HealthTimeline, Visit, FamilyLink
from routers.auth import hash_password
from services.patient_sync import ensure_patient_for_user

SEED_MARKER_EMAIL = "sample01@healthmitra.demo"
DEFAULT_SAMPLE_PASSWORD = "Sample@123"

SAMPLE_USERS = [
    {"name": "Ramesh Kumar", "email": "sample01@healthmitra.demo", "phone": "9876501001", "age": 45, "gender": "Male", "blood_group": "B+", "village": "Chandpur", "conditions": ["Diabetes", "Hypertension"], "allergies": ["Sulfa"], "height_cm": 172, "weight_kg": 78, "risk": 72},
    {"name": "Sunita Devi", "email": "sample02@healthmitra.demo", "phone": "9876501002", "age": 38, "gender": "Female", "blood_group": "O+", "village": "Chandpur", "conditions": ["Anemia"], "allergies": [], "height_cm": 158, "weight_kg": 55, "risk": 35},
    {"name": "Mohan Lal", "email": "sample03@healthmitra.demo", "phone": "9876501003", "age": 62, "gender": "Male", "blood_group": "A+", "village": "Ramgarh", "conditions": ["COPD", "Hypertension"], "allergies": ["Dust"], "height_cm": 168, "weight_kg": 70, "risk": 65},
    {"name": "Geeta Bai", "email": "sample04@healthmitra.demo", "phone": "9876501004", "age": 55, "gender": "Female", "blood_group": "B-", "village": "Ramgarh", "conditions": ["Thyroid disorder"], "allergies": ["Penicillin"], "height_cm": 160, "weight_kg": 62, "risk": 42},
    {"name": "Raju Singh", "email": "sample05@healthmitra.demo", "phone": "9876501005", "age": 28, "gender": "Male", "blood_group": "AB+", "village": "Devpur", "conditions": [], "allergies": [], "height_cm": 175, "weight_kg": 68, "risk": 18},
    {"name": "Parvati Meena", "email": "sample06@healthmitra.demo", "phone": "9876501006", "age": 67, "gender": "Female", "blood_group": "O-", "village": "Bhavanpur", "conditions": ["Diabetes", "Heart disease"], "allergies": ["Peanuts"], "height_cm": 155, "weight_kg": 64, "risk": 74},
    {"name": "Amit Rawat", "email": "sample07@healthmitra.demo", "phone": "9876501007", "age": 33, "gender": "Male", "blood_group": "A-", "village": "Nandgaon", "conditions": ["Asthma"], "allergies": ["Pollen"], "height_cm": 178, "weight_kg": 72, "risk": 28},
    {"name": "Kavita Sharma", "email": "sample08@healthmitra.demo", "phone": "9876501008", "age": 41, "gender": "Female", "blood_group": "B+", "village": "Kansas", "conditions": ["Gestational diabetes history"], "allergies": [], "height_cm": 162, "weight_kg": 58, "risk": 48},
    {"name": "Vikram Patel", "email": "sample09@healthmitra.demo", "phone": "9876501009", "age": 50, "gender": "Male", "blood_group": "O+", "village": "Kansas", "conditions": ["Hypertension"], "allergies": ["Ibuprofen"], "height_cm": 170, "weight_kg": 82, "risk": 55},
    {"name": "Lakshmi Iyer", "email": "sample10@healthmitra.demo", "phone": "9876501010", "age": 29, "gender": "Female", "blood_group": "A+", "village": "Sundarpur", "conditions": [], "allergies": ["Shellfish"], "height_cm": 165, "weight_kg": 54, "risk": 22},
    {"name": "Harish Yadav", "email": "sample11@healthmitra.demo", "phone": "9876501011", "age": 58, "gender": "Male", "blood_group": "B+", "village": "Sundarpur", "conditions": ["Kidney stones", "Diabetes"], "allergies": [], "height_cm": 169, "weight_kg": 76, "risk": 61},
    {"name": "Meena Kumari", "email": "sample12@healthmitra.demo", "phone": "9876501012", "age": 36, "gender": "Female", "blood_group": "AB-", "village": "Greenfield", "conditions": ["Migraine"], "allergies": ["Latex"], "height_cm": 157, "weight_kg": 52, "risk": 31},
    {"name": "Suresh Reddy", "email": "sample13@healthmitra.demo", "phone": "9876501013", "age": 44, "gender": "Male", "blood_group": "O+", "village": "Greenfield", "conditions": ["High cholesterol"], "allergies": [], "height_cm": 174, "weight_kg": 88, "risk": 52},
    {"name": "Anjali Nair", "email": "sample14@healthmitra.demo", "phone": "9876501014", "age": 22, "gender": "Female", "blood_group": "A+", "village": "Coastal Nagar", "conditions": [], "allergies": [], "height_cm": 163, "weight_kg": 50, "risk": 12},
    {"name": "Deepak Joshi", "email": "sample15@healthmitra.demo", "phone": "9876501015", "age": 71, "gender": "Male", "blood_group": "B-", "village": "Coastal Nagar", "conditions": ["Parkinson's", "Hypertension"], "allergies": ["Aspirin"], "height_cm": 166, "weight_kg": 65, "risk": 68},
    {"name": "Pooja Gupta", "email": "sample16@healthmitra.demo", "phone": "9876501016", "age": 31, "gender": "Female", "blood_group": "O+", "village": "Hilltop", "conditions": ["PCOS"], "allergies": [], "height_cm": 161, "weight_kg": 59, "risk": 38},
    {"name": "Rahul Verma", "email": "sample17@healthmitra.demo", "phone": "9876501017", "age": 26, "gender": "Male", "blood_group": "AB+", "village": "Hilltop", "conditions": [], "allergies": ["Eggs"], "height_cm": 180, "weight_kg": 74, "risk": 20},
    {"name": "Fatima Khan", "email": "sample18@healthmitra.demo", "phone": "9876501018", "age": 48, "gender": "Female", "blood_group": "A-", "village": "Riverside", "conditions": ["Rheumatoid arthritis"], "allergies": ["Codeine"], "height_cm": 159, "weight_kg": 61, "risk": 46},
    {"name": "Imran Sheikh", "email": "sample19@healthmitra.demo", "phone": "9876501019", "age": 39, "gender": "Male", "blood_group": "B+", "village": "Riverside", "conditions": ["Sleep apnea"], "allergies": [], "height_cm": 177, "weight_kg": 95, "risk": 58},
    {"name": "Balli Singh", "email": "balli@healthmitra.demo", "phone": "9876501020", "age": 24, "gender": "Male", "blood_group": "O+", "village": "Kansas", "conditions": [], "allergies": [], "height_cm": 173, "weight_kg": 66, "risk": 15},
]

# Pairs linked as family (by email)
FAMILY_PAIRS = [
    ("sample01@healthmitra.demo", "sample02@healthmitra.demo", "spouse"),
    ("sample03@healthmitra.demo", "sample04@healthmitra.demo", "spouse"),
    ("sample08@healthmitra.demo", "sample09@healthmitra.demo", "spouse"),
    ("sample08@healthmitra.demo", "balli@healthmitra.demo", "sibling"),
    ("sample11@healthmitra.demo", "sample12@healthmitra.demo", "spouse"),
    ("sample14@healthmitra.demo", "sample15@healthmitra.demo", "child"),
]


def seed_sample_users(db: Session) -> bool:
    """Insert demo users if not already present. Returns True if seed ran."""
    if db.query(User).filter(User.email == SEED_MARKER_EMAIL).first():
        return False

    pwd = hash_password(DEFAULT_SAMPLE_PASSWORD)
    email_to_user: dict[str, User] = {}
    now = datetime.now(timezone.utc)

    for row in SAMPLE_USERS:
        user = User(
            name=row["name"],
            email=row["email"],
            password_hash=pwd,
            phone=row["phone"],
            age=row["age"],
            gender=row["gender"],
            blood_group=row["blood_group"],
            village=row["village"],
            medical_conditions=json.dumps(row["conditions"]),
            allergies=json.dumps(row["allergies"]),
            height_cm=row["height_cm"],
            weight_kg=row["weight_kg"],
            emergency_contact=f"Family of {row['name'].split()[0]} — {row['phone']}",
            role="user",
        )
        db.add(user)
        db.flush()
        ensure_patient_for_user(db, user)
        email_to_user[row["email"]] = user

        risk = row["risk"]
        vitals_payload = {
            "vitals": {
                "height": row["height_cm"],
                "weight": row["weight_kg"],
                "bmi": round(row["weight_kg"] / ((row["height_cm"] / 100) ** 2), 1),
                "blood_sugar_fasting": 90 + (risk // 3),
                "blood_pressure_systolic": 110 + (risk // 4),
                "blood_pressure_diastolic": 70 + (risk // 8),
            },
            "diabetes_risk": min(95, risk + 5),
            "heart_risk": min(95, risk),
            "combined_risk": risk,
            "recommendations": [
                "Monitor vitals weekly",
                "Follow a balanced rural diet plan",
                "Visit ASHA worker if symptoms worsen",
            ],
        }
        patient = db.query(Patient).filter(Patient.user_id == user.id).first()
        db.add(HealthTimeline(
            user_id=user.id,
            patient_id=patient.id if patient else None,
            event_type="vitals",
            title="Health Risk Assessment",
            description=f"Sample seed — combined risk {risk}%",
            risk_score=risk,
            data_json=json.dumps(vitals_payload),
            created_at=now - timedelta(days=7),
        ))

        if risk >= 25:
            db.add(MedicalReport(
                user_id=user.id,
                patient_id=patient.id if patient else None,
                filename=f"{row['name'].replace(' ', '_')}_lab_report.pdf",
                ocr_text=f"Fasting glucose {90 + risk // 2} mg/dL. Cholesterol panel reviewed.",
                explanation_en=f"Sample report for {row['name']}. Elevated markers consistent with {', '.join(row['conditions']) or 'general screening'}.",
                explanation_hi=f"{row['name']} की रिपोर्ट — नियमित जांच जारी रखें।",
                risk_score=float(risk),
                risk_level="high" if risk >= 60 else "moderate" if risk >= 30 else "low",
                created_at=now - timedelta(days=14),
            ))

        if row["email"] in ("sample01@healthmitra.demo", "sample06@healthmitra.demo", "balli@healthmitra.demo"):
            db.add(Visit(
                user_id=user.id,
                patient_name=user.name,
                village_name=user.village,
                visit_date=now + timedelta(days=3),
                purpose="Follow-up checkup",
                status="scheduled",
                check_in_code=secrets.token_hex(4).upper(),
            ))

    for email_a, email_b, relation in FAMILY_PAIRS:
        ua, ub = email_to_user.get(email_a), email_to_user.get(email_b)
        if not ua or not ub:
            continue
        for u1, u2, rel in ((ua, ub, relation), (ub, ua, relation)):
            exists = db.query(FamilyLink).filter(
                FamilyLink.user_id == u1.id,
                FamilyLink.linked_user_id == u2.id,
            ).first()
            if not exists:
                db.add(FamilyLink(user_id=u1.id, linked_user_id=u2.id, relation=rel))

    db.commit()
    return True
