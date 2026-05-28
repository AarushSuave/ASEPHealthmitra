import sys
import os
import json

# Add backend to path
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.ocr_service import extract_text_from_file

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\Report-2429011568-1.pdf'

try:
    result = extract_text_from_file(file_path)
    print(json.dumps(result, indent=2))
except Exception as e:
    print(f"Error: {e}")
