"""Verify that all 5 sample reports are parsed with 100% accuracy by the OCR pipeline."""
import sys, os, json
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))
os.chdir(os.path.join(os.path.dirname(__file__), "backend"))

from services.ocr_service import extract_text_from_file

REPORT_DIR = os.path.join(os.path.dirname(__file__), "test", "sample_reports")

# Expected values per report (parameter -> expected float value)
EXPECTED = {
    "Sterling_Accuris_Diagnostics_Report.pdf": {
        "Hemoglobin": 11.2, "RBC Count": 4.1, "WBC": 7200, "Platelet Count": 210,
        "Hematocrit": 38.5, "MCV": 93.9, "MCH": 27.3, "MCHC": 29.1,
        "Total Cholesterol": 248, "LDL Cholesterol": 165, "HDL Cholesterol": 38,
        "Triglycerides": 225, "Fasting Blood Sugar": 142, "HbA1c": 7.2,
        "Total Bilirubin": 0.9, "Direct Bilirubin": 0.2, "Indirect Bilirubin": 0.7,
        "SGPT": 62, "SGOT": 48, "ALP": 95,
        "Total Protein": 7.1, "Albumin": 4.2, "Globulin": 2.9,
        "Urea": 52, "Creatinine": 1.4, "Uric Acid": 7.8, "BUN": 24, "eGFR": 55,
    },
    "LifeCare_Pathology_Labs_Report.pdf": {
        "Fasting Blood Sugar": 118, "HbA1c": 6.1,
        "Total Cholesterol": 215, "LDL Cholesterol": 138, "HDL Cholesterol": 52,
        "Triglycerides": 168, "Homocysteine": 18.5, "Lp(a)": 88,
        "TSH": 5.8, "Vitamin D": 18, "Vitamin B12": 185,
    },
    "MedScan_Advanced_Diagnostics_Report.pdf": {
        "Hemoglobin": 15.2, "RBC Count": 5.1, "WBC": 6800, "Platelet Count": 285,
        "Hematocrit": 45.2, "MCV": 88.6, "MCH": 29.8, "MCHC": 33.6,
        "Total Cholesterol": 192, "LDL Cholesterol": 110, "HDL Cholesterol": 55,
        "Triglycerides": 135, "Fasting Blood Sugar": 95, "HbA1c": 5.4,
        "SGPT": 32, "SGOT": 28, "Total Bilirubin": 0.8,
        "Direct Bilirubin": 0.2, "Indirect Bilirubin": 0.6, "ALP": 78,
        "Total Protein": 7.4, "Albumin": 4.5, "Globulin": 2.9,
        "Urea": 28, "Creatinine": 0.9, "Uric Acid": 5.5, "eGFR": 98,
        "TSH": 2.1, "Vitamin D": 42, "Vitamin B12": 450,
    },
    "Precision_Diagnostic_Centre_Report.pdf": {
        "Total Bilirubin": 1.8, "Direct Bilirubin": 0.5, "Indirect Bilirubin": 1.3,
        "SGPT": 85, "SGOT": 72, "ALP": 145,
        "Total Protein": 5.8, "Albumin": 3.2, "Globulin": 2.6,
        "Urea": 65, "Creatinine": 1.8, "Uric Acid": 8.5, "BUN": 30, "eGFR": 42,
        "Hemoglobin": 10.5, "RBC Count": 3.6, "WBC": 12500, "Platelet Count": 130,
        "Hematocrit": 33.5,
    },
    "VitaCheck_Health_Laboratories_Report.pdf": {
        "Vitamin D": 12, "Vitamin B12": 142, "TSH": 6.2,
        "Fasting Blood Sugar": 105, "HbA1c": 5.9,
        "Total Cholesterol": 230, "LDL Cholesterol": 155, "HDL Cholesterol": 35,
        "Triglycerides": 198,
        "Hemoglobin": 12.8, "RBC Count": 4.3, "WBC": 5600, "Platelet Count": 320,
        "Hematocrit": 39.2, "MCV": 91.2, "MCH": 29.8, "MCHC": 32.7,
        "Homocysteine": 22, "Lp(a)": 95,
        "Urea": 35, "Creatinine": 1.0, "eGFR": 92,
    },
}

# Lab names that must appear in the OCR text
LAB_NAMES = [
    "Sterling Accuris Diagnostics",
    "LifeCare Pathology Labs",
    "MedScan Advanced Diagnostics",
    "Precision Diagnostic Centre",
    "VitaCheck Health Laboratories",
]

def main():
    total_params = 0
    matched_params = 0
    total_reports = 0
    passed_reports = 0
    lab_names_found = 0

    for fname, expected in EXPECTED.items():
        fpath = os.path.join(REPORT_DIR, fname)
        print(f"\n{'='*70}")
        print(f"TESTING: {fname}")
        print(f"{'='*70}")

        if not os.path.exists(fpath):
            print(f"  [FAIL] File not found: {fpath}")
            continue

        result = extract_text_from_file(fpath)
        total_reports += 1

        if "error" in result:
            print(f"  [FAIL] OCR Error: {result['error']}")
            continue

        # Check lab name in OCR text
        ocr_text = result.get("ocr_text", "")
        lab_name = LAB_NAMES[list(EXPECTED.keys()).index(fname)]
        if lab_name.lower() in ocr_text.lower():
            print(f"  [OK] Lab name '{lab_name}' found in OCR text")
            lab_names_found += 1
        else:
            print(f"  [WARN] Lab name '{lab_name}' NOT found in OCR text")

        # Check extracted parameters
        report = result.get("report", {})
        all_params = (report.get("red_flags", []) + report.get("borderline", []) +
                      report.get("normal", []))

        extracted = {p["parameter"]: p["value"] for p in all_params}
        report_ok = True

        for param, exp_val in expected.items():
            total_params += 1
            if param in extracted:
                got = extracted[param]
                if abs(got - exp_val) < 0.01:
                    matched_params += 1
                    print(f"  [OK] {param}: {got} == {exp_val}")
                else:
                    print(f"  [FAIL] {param}: got {got}, expected {exp_val}")
                    report_ok = False
            else:
                print(f"  [MISS] {param}: NOT extracted (expected {exp_val})")
                report_ok = False

        # Show extra extracted params
        for param, val in extracted.items():
            if param not in expected:
                print(f"  [EXTRA] {param}: {val}")

        if report_ok:
            passed_reports += 1
            print(f"\n  RESULT: ALL {len(expected)} parameters matched!")
        else:
            print(f"\n  RESULT: Some parameters failed!")

        # Risk info
        cv = report.get("risk_scores", {}).get("cardiovascular", {})
        print(f"  Risk: {cv.get('level', 'N/A')} ({cv.get('score', 'N/A')}%)")

    # ── Summary ──────────────────────────────────────────────────────
    print(f"\n{'='*70}")
    print(f"VERIFICATION SUMMARY")
    print(f"{'='*70}")
    print(f"  Reports tested:    {total_reports}/{len(EXPECTED)}")
    print(f"  Reports passed:    {passed_reports}/{total_reports}")
    print(f"  Parameters tested: {total_params}")
    print(f"  Parameters matched:{matched_params}/{total_params}")
    print(f"  Lab names found:   {lab_names_found}/{len(LAB_NAMES)}")
    accuracy = (matched_params / total_params * 100) if total_params else 0
    print(f"  ACCURACY:          {accuracy:.1f}%")

    if accuracy == 100.0 and lab_names_found == len(LAB_NAMES):
        print(f"\n  *** ALL TESTS PASSED - 100% OCR ACCURACY ***")
    else:
        print(f"\n  *** SOME TESTS FAILED ***")
        sys.exit(1)


if __name__ == "__main__":
    main()
