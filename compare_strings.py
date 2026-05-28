with open("backend/services/clinical_engine.py", "r", encoding="utf-8") as f:
    ce_content = f.read()

with open("backend/services/ocr_service.py", "r", encoding="utf-8") as f:
    ocr_content = f.read()

import re

ce_matches = [m.group() for m in re.finditer(r"Lp\s*\(a\)", ce_content)]
ocr_matches = [m.group() for m in re.finditer(r"Lp\s*\(a\)", ocr_content)]

print(f"Clinical Engine matches: {ce_matches}")
print(f"OCR Service matches: {ocr_matches}")

if ce_matches and ocr_matches:
    m1 = ce_matches[0]
    m2 = ocr_matches[0]
    print(f"Equality check (m1 == m2): {m1 == m2}")
    if m1 != m2:
        print(f"m1 bytes: {m1.encode()}")
        print(f"m2 bytes: {m2.encode()}")
else:
    print("Could not find matches in both files.")
