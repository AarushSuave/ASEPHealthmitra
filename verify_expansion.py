import sys
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.ocr_service import extract_text_from_file

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\Report-2429011568-1.pdf'
log_file = 'verification_results.txt'

def run_verify():
    with open(log_file, 'w', encoding='utf-8') as f:
        msg = "\n--- VERIFYING EXPANDED EXTRACTION ---\n"
        print(msg)
        f.write(msg)
        try:
            result = extract_text_from_file(file_path)
            report = result.get("report", {})
            
            all_found = report.get("red_flags", []) + report.get("borderline", []) + report.get("normal", [])
            output = f"TOTAL PARAMETERS EXTRACTED: {len(all_found)}\n"
            print(output)
            f.write(output)
            
            # Group by category
            categories = {
                "Heart/Lipids": ["Cholesterol", "LDL", "HDL", "Triglycerides", "Lp(a)", "Homocysteine"],
                "Diabetes/Metabolic": ["Glucose", "HbA1c", "Vitamin D", "TSH"],
                "CBC (Blood)": ["Hemoglobin", "RBC", "Platelet", "WBC", "Hematocrit", "MCV", "MCH", "MCHC"],
                "Liver (LFT)": ["SGPT", "SGOT", "Bilirubin", "Protein", "Albumin", "Globulin", "ALP"],
                "Kidney (KFT)": ["Creatinine", "Urea", "Uric Acid", "BUN", "eGFR"]
            }
            
            found_by_cat = {cat: [] for cat in categories}
            other = []
            
            for p in all_found:
                name = p.get("parameter")
                found_cat = False
                for cat, keywords in categories.items():
                    if any(k.lower() in name.lower() for k in keywords):
                        found_by_cat[cat].append(p)
                        found_cat = True
                        break
                if not found_cat:
                    other.append(p)
            
            for cat, params in found_by_cat.items():
                section_msg = f"\n[{cat}] ({len(params)}):\n"
                print(section_msg)
                f.write(section_msg)
                for p in params:
                    p_msg = f"  - {p.get('parameter')}: {p.get('value')} {p.get('unit')} ({p.get('status')})\n"
                    print(p_msg)
                    f.write(p_msg)
            
            if other:
                other_msg = f"\n[Other] ({len(other)}):\n"
                print(other_msg)
                f.write(other_msg)
                for p in other:
                    p_msg = f"  - {p.get('parameter')}: {p.get('value')} {p.get('unit')} ({p.get('status')})\n"
                    print(p_msg)
                    f.write(p_msg)

            rem_msg = "\nREMEDIES SUGGESTED:\n"
            print(rem_msg)
            f.write(rem_msg)
            for r in report.get("remedies", []):
                r_msg = f"- {r}\n"
                print(r_msg)
                f.write(r_msg)
                
        except Exception as e:
            err_msg = f"Verification Error: {e}\n"
            print(err_msg)
            f.write(err_msg)
            import traceback
            f.write(traceback.format_exc())

if __name__ == "__main__":
    run_verify()
