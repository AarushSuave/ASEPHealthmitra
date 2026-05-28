import re

with open("backend/services/ocr_service.py", "r", encoding="utf-8") as f:
    content = f.read()

# Find the MEDICAL_PATTERNS dict
match = re.search(r"MEDICAL_PATTERNS = \{(.*?)\n\}", content, re.DOTALL)
if match:
    block = match.group(1)
    keys = re.findall(r'"(.*?)"\s*:', block)
    for k in keys:
        if "Lp" in k:
            print(f"Key: '{k}', Bytes: {k.encode()}")
else:
    print("Could not find MEDICAL_PATTERNS")
