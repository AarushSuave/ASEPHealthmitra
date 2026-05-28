import re

with open("backend/services/clinical_engine.py", "r", encoding="utf-8") as f:
    ce = f.read()

with open("backend/services/ocr_service.py", "r", encoding="utf-8") as f:
    ocr = f.read()

# 1. Required markers in calculate_cv_risk
required_match = re.search(r'required = \[(.*?)\]', ce)
required = [s.strip().strip("'").strip('"') for s in required_match.group(1).split(",")]

# 2. Keys in KEY_MAP
key_map_match = re.search(r"KEY_MAP = \{(.*?)\}", ce, re.DOTALL)
key_map_keys = [s.strip().strip("'").strip('"') for s in re.findall(r'"(.*?)"\s*:', key_map_match.group(1))]

# 3. Keys in MEDICAL_PATTERNS
ocr_match = re.search(r"MEDICAL_PATTERNS = \{(.*?)\n\}", ocr, re.DOTALL)
ocr_keys = [s.strip().strip("'").strip('"') for s in re.findall(r'"(.*?)"\s*:', ocr_match.group(1))]

print(f"Required: {required}")
print(f"KEY_MAP Keys: {key_map_keys}")
print(f"OCR Keys: {ocr_keys}")

for r in required:
    in_km = r in key_map_keys
    in_ocr = r in ocr_keys
    print(f"Marker '{r}': In KEY_MAP={in_km}, In OCR={in_ocr}")
    if not in_km or not in_ocr:
        # Check for similar items
        print(f"  Similar in KM: {[k for k in key_map_keys if r.lower() in k.lower() or k.lower() in r.lower()]}")
        print(f"  Similar in OCR: {[k for k in ocr_keys if r.lower() in k.lower() or k.lower() in r.lower()]}")
