import sys
import os
import json
import logging

logging.basicConfig(level=logging.INFO)
sys.path.append(os.path.join(os.getcwd(), 'backend'))

from backend.services.llm_service import explain_report

# Dummy report data
report_data = {
    "red_flags": [{"parameter": "Homocysteine", "value": 18.9, "unit": "µmol/L", "status": "High"}],
    "borderline": [],
    "normal": [{"parameter": "TSH", "value": 4.0, "unit": "mIU/L", "status": "Normal"}],
    "risk_scores": {"cardiovascular": {"score": 15, "level": "Low"}},
    "incomplete": []
}

try:
    print("Testing LLM Explanation (EN)...")
    explanation = explain_report(report_data, "en")
    print("SUCCESS: EN Explanation complete")
    print(f"Length: {len(explanation)}")
    
    print("\nTesting LLM Explanation (HI)...")
    explanation_hi = explain_report(report_data, "hi")
    print("SUCCESS: HI Explanation complete")
    print(f"Length: {len(explanation_hi)}")
except Exception as e:
    print(f"FAILED: {e}")
