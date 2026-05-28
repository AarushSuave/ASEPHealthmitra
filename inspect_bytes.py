import re

def inspect_file(path):
    print(f"--- Inspecting {path} ---")
    with open(path, "r", encoding="utf-8") as f:
        content = f.read()
    
    # Find all occurrences of Lp(a) or similar
    matches = re.finditer(r"Lp\s*\(a\)", content, re.IGNORECASE)
    for m in matches:
        text = m.group()
        print(f"Found: '{text}' at index {m.start()}, bytes: {text.encode()}")

inspect_file("backend/services/clinical_engine.py")
inspect_file("backend/services/ocr_service.py")
