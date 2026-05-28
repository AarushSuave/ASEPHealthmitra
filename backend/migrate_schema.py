import sqlite3
import os

db_path = os.path.join(os.path.dirname(__file__), "healthmitra_v2.db")

def migrate():
    print(f"Checking database at: {db_path}")
    if not os.path.exists(db_path):
        print("Database file not found!")
        return

    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()

    # Check columns in medical_reports
    cursor.execute("PRAGMA table_info(medical_reports)")
    columns = [row[1] for row in cursor.fetchall()]
    
    print(f"Current columns in medical_reports: {columns}")

    if "structured_data" not in columns:
        print("Adding 'structured_data' column to 'medical_reports'...")
        try:
            cursor.execute("ALTER TABLE medical_reports ADD COLUMN structured_data TEXT")
            conn.commit()
            print("Successfully added 'structured_data' column.")
        except Exception as e:
            print(f"Error adding structured_data: {e}")
    else:
        print("'structured_data' column already exists.")

    if "remedies" not in columns:
        print("Adding 'remedies' column to 'medical_reports'...")
        try:
            cursor.execute("ALTER TABLE medical_reports ADD COLUMN remedies TEXT")
            conn.commit()
            print("Successfully added 'remedies' column.")
        except Exception as e:
            print(f"Error adding remedies: {e}")
    else:
        print("'remedies' column already exists.")

    conn.close()

if __name__ == "__main__":
    migrate()
