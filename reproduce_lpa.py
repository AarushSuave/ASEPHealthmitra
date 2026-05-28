from backend.services.clinical_engine import process_clinical_results

mock_data = [
    {"section": "Laboratory", "parameter": "LDL-Cholesterol", "value": 141.0, "unit": "mg/dL"}, # Hyphenate
    {"section": "Laboratory", "parameter": "HDL  Cholesterol", "value": 45.0, "unit": "mg/dL"}, # Double space
    {"section": "Laboratory", "parameter": "triglycerides", "value": 120.0, "unit": "mg/dL"}, # Lowercase
    {"section": "Laboratory", "parameter": "Lp (a) ", "value": 103.2, "unit": "nmol/L"}, # Spaces and trailing space
    {"section": "Laboratory", "parameter": "Homocysteine", "value": 12.0, "unit": "\u00b5mol/L"}
]

report = process_clinical_results(mock_data)
risk = report.risk_scores["cardiovascular"]

print(f"Risk Status: {risk['status']}")
if risk['status'] != "Calculated":
    print(f"Missing parameters: {risk.get('missing')}")
else:
    print(f"Risk Score: {risk['score']}")

# Let's check the MedicalParameter objects
for p in report.normal + report.red_flags + report.borderline + report.incomplete:
    print(f"Parameter: '{p.parameter}', Validated: {p.validated}, Value: {p.value}")
