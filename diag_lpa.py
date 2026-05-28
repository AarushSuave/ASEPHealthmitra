import re

with open("backend/services/clinical_engine.py", "r", encoding="utf-8") as f:
    content = f.read()

# Extract KEY_MAP
key_map_match = re.search(r"KEY_MAP = \{(.*?)\}", content, re.DOTALL)
if key_map_match:
    lines = key_map_match.group(1).split("\n")
    for line in lines:
        if "Lp(a)" in line:
            print(f"KEY_MAP line: '{line.strip()}'")
            print(f"Bytes: {line.strip().encode()}")

# Extract required
required_match = re.search(r'required = \[(.*?)\]', content)
if required_match:
    print(f"required line: '{required_match.group(1).strip()}'")
    print(f"Bytes: {required_match.group(1).strip().encode()}")

# Also check MEDICAL_PATTERNS in ocr_service.py
with open("backend/services/ocr_service.py", "r", encoding="utf-8") as f:
    ocr_content = f.read()

ocr_match = re.search(r'"Lp\(a\)": \{', ocr_content)
if ocr_match:
    print(f"Found Lp(a) in MEDICAL_PATTERNS")
