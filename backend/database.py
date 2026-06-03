"""HealthMitra Scan – Database Setup"""
from sqlalchemy import create_engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from config import DATABASE_URL

engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    from models import Base as ModelBase  # noqa: F401
    ModelBase.metadata.create_all(bind=engine)
    _run_sqlite_migrations()
    _backfill_patients_for_users()
    _seed_sample_users_if_needed()


def _run_sqlite_migrations():
    """Add columns introduced after first deploy (SQLite-safe)."""
    from sqlalchemy import inspect, text
    inspector = inspect(engine)
    table_columns = {
        name: {col["name"] for col in inspector.get_columns(name)}
        for name in inspector.get_table_names()
    }

    migrations = [
        ("users", "village", "ALTER TABLE users ADD COLUMN village VARCHAR(100)"),
        ("users", "height_cm", "ALTER TABLE users ADD COLUMN height_cm FLOAT"),
        ("users", "weight_kg", "ALTER TABLE users ADD COLUMN weight_kg FLOAT"),
        ("patients", "user_id", "ALTER TABLE patients ADD COLUMN user_id INTEGER"),
        ("visits", "check_in_code", "ALTER TABLE visits ADD COLUMN check_in_code VARCHAR(8)"),
        ("visits", "checked_in_at", "ALTER TABLE visits ADD COLUMN checked_in_at DATETIME"),
    ]

    with engine.begin() as conn:
        for table, column, sql in migrations:
            if table not in table_columns:
                continue
            if column not in table_columns[table]:
                conn.execute(text(sql))


def _backfill_patients_for_users():
    """Link existing registered users to Patient rows for admin sync."""
    import secrets
    from models import Patient, User, Visit
    from services.patient_sync import ensure_patient_for_user

    db = SessionLocal()
    try:
        for user in db.query(User).filter(User.role == "user").all():
            if not db.query(Patient).filter(Patient.user_id == user.id).first():
                ensure_patient_for_user(db, user)

        for visit in db.query(Visit).filter(
            Visit.status == "scheduled",
            Visit.check_in_code == None,
        ).all():
            visit.check_in_code = secrets.token_hex(4).upper()
        db.commit()
    finally:
        db.close()


def _seed_sample_users_if_needed():
    from services.sample_seed import seed_sample_users

    db = SessionLocal()
    try:
        if seed_sample_users(db):
            print("[HealthMitra] Seeded 20 sample users (password: Sample@123)")
    finally:
        db.close()
