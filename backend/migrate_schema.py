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

    if "lab_name" not in columns:
        print("Adding 'lab_name' column to 'medical_reports'...")
        try:
            cursor.execute("ALTER TABLE medical_reports ADD COLUMN lab_name VARCHAR(200)")
            conn.commit()
            print("Successfully added 'lab_name' column.")
        except Exception as e:
            print(f"Error adding lab_name: {e}")
    else:
        print("'lab_name' column already exists.")

    # Check columns in users
    cursor.execute("PRAGMA table_info(users)")
    user_columns = [row[1] for row in cursor.fetchall()]
    if "role" not in user_columns:
        print("Adding 'role' column to 'users'...")
        try:
            cursor.execute("ALTER TABLE users ADD COLUMN role VARCHAR(20) DEFAULT 'user'")
            conn.commit()
            print("Successfully added 'role' column.")
        except Exception as e:
            print(f"Error adding role: {e}")
    
    # Create visits table
    print("Creating 'visits' table if not exists...")
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS visits (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                patient_name VARCHAR(100),
                village_name VARCHAR(100),
                visit_date DATETIME,
                purpose VARCHAR(255),
                status VARCHAR(20) DEFAULT 'scheduled',
                notes TEXT,
                created_at DATETIME,
                FOREIGN KEY(user_id) REFERENCES users(id)
            )
        """)
        conn.commit()
        print("Successfully created 'visits' table.")
    except Exception as e:
        print(f"Error creating visits table: {e}")

    conn.close()

if __name__ == "__main__":
    migrate()
