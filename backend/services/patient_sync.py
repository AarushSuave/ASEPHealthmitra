"""Keep Patient records in sync with registered User accounts for admin portal."""
from sqlalchemy.orm import Session
from models import Patient, User


def ensure_patient_for_user(db: Session, user: User) -> Patient:
    """Return the Patient row linked to this user, creating or updating as needed."""
    patient = db.query(Patient).filter(Patient.user_id == user.id).first()
    if not patient:
        patient = Patient(
            user_id=user.id,
            name=user.name,
            age=user.age,
            gender=user.gender,
            blood_group=user.blood_group,
            phone=user.phone,
            village=user.village,
        )
        db.add(patient)
    else:
        patient.name = user.name
        patient.age = user.age
        patient.gender = user.gender
        patient.blood_group = user.blood_group
        patient.phone = user.phone
        patient.village = user.village or None
    db.commit()
    db.refresh(patient)
    return patient


def sync_user_profile_fields(db: Session, user: User) -> Patient:
    """After profile edits, refresh linked patient row."""
    return ensure_patient_for_user(db, user)
