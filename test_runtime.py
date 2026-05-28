import sys
import os

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from services.clinical_engine import calculate_cv_risk, MedicalParameter

# Create mock parameters
p_lpa = MedicalParameter(
    section="Lab",
    parameter="Lp(a)",
    value=103.2,
    unit="nmol/L",
    guideline_reference="N/A",
    classification_used="N/A",
    status="High",
    severity=2,
    validated=True
)

# Test calculation
res = calculate_cv_risk([p_lpa])
print(f"\n--- CALCULATION RESULT ---")
print(f"Status: {res['status']}")

if res["status"] == "Unavailable":
    missing_list = res['missing']
    print(f"\nMISSING LIST:")
    for m in missing_list:
        print(f"  Item: '{m}'")
        print(f"  Bytes: {list(m.encode())}")
        
    print(f"\nAVAILABLE PARAMETER:")
    print(f"  Item: '{p_lpa.parameter}'")
    print(f"  Bytes: {list(p_lpa.parameter.encode())}")
    
    # Check Lp(a) specifically
    for m in missing_list:
        if m.startswith("Lp"):
            print(f"\nCOMPARING '{m}' vs '{p_lpa.parameter}':")
            print(f"  Lengths: {len(m)} vs {len(p_lpa.parameter)}")
            print(f"  Equality: {m == p_lpa.parameter}")
            for i, (c1, c2) in enumerate(zip(m, p_lpa.parameter)):
                print(f"  Char {i}: '{c1}' ({ord(c1)}) vs '{c2}' ({ord(c2)})")
