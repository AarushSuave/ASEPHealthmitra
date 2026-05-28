import sys
import os
import json
import re
import logging

logging.basicConfig(level=logging.INFO)

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.ocr_service import extract_text_from_file, MEDICAL_PATTERNS

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\Report-2429011568-1.pdf'

def run_diag():
    print("\n--- REGEX DEBUG ---")
    test_str = "homocysteine, edta plasma/ 18.9 5.46-16.2 umol/l"
    h_config = MEDICAL_PATTERNS["Homocysteine"]
    print(f"Pattern used: {h_config['pattern']}")
    test_match = re.search(h_config["pattern"], test_str, re.IGNORECASE)
    if test_match:
        print(f"Homocysteine TEST MATCH SUCCESS: {test_match.group(1)}")
    else:
        print("Homocysteine TEST MATCH FAILED")

    print("\n--- FULL EXTRACTION RESULTS ---")
    try:
        result = extract_text_from_file(file_path)
        print("EXTRACTED FINDINGS:")
        report = result.get("report", {})
        all_found = report.get("red_flags", []) + report.get("borderline", []) + report.get("normal", [])
        for f in all_found:
            print(f"- {f.get('parameter')}: {f.get('value')} {f.get('unit')} ({f.get('status')})")
        
        print("\nINCOMPLETE/MISSING:")
        for f in report.get("incomplete", []):
            print(f"- {f.get('parameter')}: {f.get('status')}")
        
        risk_scores = report.get("risk_scores", {})
        cv_risk = risk_scores.get("cardiovascular", {})
        print(f"\nCV RISK SCORE: {cv_risk.get('score')} ({cv_risk.get('level')})")
        if cv_risk.get('missing'):
            print(f"MISSING FOR RISK: {', '.join(cv_risk.get('missing'))}")
            
    except Exception as e:
        print(f"Extraction Error: {e}")

if __name__ == "__main__":
    run_diag()
