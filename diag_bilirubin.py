import re
import sys
import os
sys.path.append(os.path.join(os.getcwd(), 'backend'))
from services.ocr_service import MEDICAL_PATTERNS, extract_text_from_file

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\sterling-accuris-pathology-sample-report-unlocked.pdf'

def diag_bilirubin():
    print(f"Testing Bilirubin extraction for: {file_path}")
    
    # Test specific regexes first
    lines = [
        "Conjugated Bilirubin 0.30 mg/dL 0.0 - 0.3",
        "Unconjugated Bilirubin 0.20 mg/dL 0.0 - 1.1"
    ]
    
    for name in ["Direct Bilirubin", "Indirect Bilirubin"]:
        pattern = MEDICAL_PATTERNS[name]["pattern"]
        print(f"\nPattern for {name}: {pattern}")
        for line in lines:
            match = re.search(pattern, line.lower())
            if match:
                print(f"MATCH on '{line}': {match.group(1)}")
            else:
                print(f"NO MATCH on '{line}'")

    # Now test full extraction
    result = extract_text_from_file(file_path)
    report = result.get("report", {})
    
    print("\nREPORT CATEGORIES:")
    for cat in ["red_flags", "borderline", "normal", "incomplete"]:
        print(f"\n{cat.upper()}:")
        for p in report.get(cat, []):
            print(f"  - {p['parameter']}: {p['value']} {p['unit']} ({p['status']})")

if __name__ == "__main__":
    diag_bilirubin()
