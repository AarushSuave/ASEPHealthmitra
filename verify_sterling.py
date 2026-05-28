from services.ocr_service import extract_text_from_file
import json
import os

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\sterling-accuris-pathology-sample-report-unlocked.pdf'

def verify():
    print(f"Testing extraction for: {file_path}")
    result = extract_text_from_file(file_path)
    
    if "error" in result:
        print(f"ERROR: {result['error']}")
        return

    report = result.get("report", {})
    
    # Collect all parameters from different categories
    all_params = []
    for cat in ["red_flags", "borderline", "normal", "incomplete"]:
        all_params.extend(report.get(cat, []))
    
    print("\nEXTRACTED PARAMETERS:")
    found_creatinine = False
    for p in all_params:
        print(f"  - {p['parameter']:25}: {p['value']:>8} {p['unit']:10} [{p['status']:10}]")
        if p['parameter'] == "Creatinine":
            found_creatinine = True
            creatinine_val = p['value']
            
    if found_creatinine:
        print(f"\nSUCCESS: Creatinine found! Value: {creatinine_val}")
    else:
        print("\nFAILURE: Creatinine NOT found.")

if __name__ == "__main__":
    verify()
