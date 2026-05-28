import sqlite3
import json
import os

db_path = "backend/healthmitra_v2.db"
if not os.path.exists(db_path):
    print("Database not found")
    exit()

conn = sqlite3.connect(db_path)
cursor = conn.cursor()

cursor.execute("SELECT id, filename, structured_data FROM medical_reports ORDER BY id DESC")
rows = cursor.fetchall()

for row in rows:
    report_id, filename, structured_data_json = row
    if structured_data_json:
        data = json.loads(structured_data_json)
        risk_scores = data.get("risk_scores", {})
        cv_risk = risk_scores.get("cardiovascular", {})
        missing = cv_risk.get("missing", [])
        status = cv_risk.get("status", "Unknown")
        
        print(f"ID: {report_id}, File: {filename}")
        print(f"  CV Risk Status: {status}")
        if missing:
            print(f"  Missing: {missing}")
    else:
        print(f"ID: {report_id}, File: {filename} - No structured data")
    if structured_data_json:
        data = json.loads(structured_data_json)
        # ClinicalReport has red_flags, borderline, normal, incomplete
        all_params = data.get("red_flags", []) + data.get("borderline", []) + data.get("normal", []) + data.get("incomplete", [])
        with open("db_results.txt", "w") as out:
            out.write("DATA_START\n")
            for p in all_params:
                name = p.get("parameter", "")
                if any(m in name for m in ["LDL", "HDL", "Trigly", "Lp", "Homocy"]):
                    out.write(f"NAME:{name}\n")
                    out.write(f"BYTES:{list(name.encode())}\n")
                    out.write(f"VAL:{p.get('validated')}\n")
            out.write("DATA_END\n")
        print("Results written to db_results.txt")
    else:
        print("structured_data is empty")
else:
    print("No reports found")

conn.close()
