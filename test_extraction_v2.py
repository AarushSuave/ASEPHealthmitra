import sys
import os
import logging

logging.basicConfig(level=logging.INFO)
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.ocr_service import extract_text_from_file

file_path = os.path.join(os.getcwd(), 'backend', 'uploads', 'sample_medical_report.png')

try:
    print(f"Testing extraction for: {file_path}")
    result = extract_text_from_file(file_path)
    print("SUCCESS: Extraction complete")
    print(f"Found {len(result['report'].get('normal', [])) + len(result['report'].get('red_flags', [])) + len(result['report'].get('borderline', []))} parameters.")
except Exception as e:
    print(f"FAILED: {e}")
    import traceback
    traceback.print_exc()
