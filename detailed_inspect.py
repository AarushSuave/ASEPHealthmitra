import os

def detailed_inspect(path):
    print(f"--- Detailed Inspection of {path} ---")
    if not os.path.exists(path):
        print(f"File {path} not found!")
        return
    with open(path, "rb") as f:
        content = f.read()
    
    # Search for "Lp(a)" bytes
    target = b"Lp(a)"
    idx = content.find(target)
    while idx != -1:
        print(f"Found {target} at {idx}: {list(content[idx:idx+len(target)])}")
        idx = content.find(target, idx + 1)

detailed_inspect("backend/services/clinical_engine.py")
detailed_inspect("backend/services/ocr_service.py")
