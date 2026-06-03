"""Manually seed sample users (if DB existed before auto-seed was added)."""
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from database import SessionLocal, init_db
from services.sample_seed import seed_sample_users

if __name__ == "__main__":
    init_db()
    db = SessionLocal()
    try:
        if seed_sample_users(db):
            print("Seeded 20 sample users. Password: Sample@123")
        else:
            print("Sample users already present (sample01@healthmitra.demo exists).")
    finally:
        db.close()
