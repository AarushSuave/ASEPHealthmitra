"""HealthMitra Scan – Database Models"""
from sqlalchemy import Column, Integer, String, Float, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    phone = Column(String(15))
    age = Column(Integer)
    gender = Column(String(10))
    blood_group = Column(String(5))
    profile_photo = Column(String(255))  # path to uploaded photo
    medical_conditions = Column(Text)  # JSON: ["diabetes", "hypertension"]
    allergies = Column(Text)  # JSON: ["peanuts", "penicillin"]
    emergency_contact = Column(String(100))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relationships
    reports = relationship("MedicalReport", back_populates="user")
    timeline = relationship("HealthTimeline", back_populates="user")


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(100), nullable=False)
    age = Column(Integer)
    gender = Column(String(10))
    blood_group = Column(String(5))
    phone = Column(String(15))
    village = Column(String(100))
    asha_worker_id = Column(String(50))
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))


class MedicalReport(Base):
    __tablename__ = "medical_reports"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, nullable=True)
    filename = Column(String(255))
    ocr_text = Column(Text)
    explanation_en = Column(Text)
    explanation_hi = Column(Text)
    risk_score = Column(Float, default=0.0)
    risk_level = Column(String(20))
    critical_alerts = Column(Text)
    structured_data = Column(Text)  # JSON: Full ClinicalReport output
    remedies = Column(Text)  # JSON: List of strings
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="reports")
class HealthTimeline(Base):
    __tablename__ = "health_timeline"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=True)
    patient_id = Column(Integer, nullable=True)
    event_type = Column(String(50))  # report, scan, alert, vitals
    title = Column(String(200))
    description = Column(Text)
    risk_score = Column(Float)
    data_json = Column(Text)  # Additional JSON data
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    user = relationship("User", back_populates="timeline")
