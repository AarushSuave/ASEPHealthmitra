import sys
import os
import inspect

# Add backend to path
sys.path.append(os.path.abspath("backend"))

from services.clinical_engine import calculate_cv_risk

# Get the source of calculate_cv_risk
source = inspect.getsource(calculate_cv_risk)
print("Source of calculate_cv_risk:")
print(source)

# Extract required list
import re
match = re.search(r'required = \[(.*?)\]', source)
if match:
    items = [i.strip().strip("'").strip('"') for i in match.group(1).split(",")]
    for item in items:
        print(f"Item: '{item}', Bytes: {list(item.encode())}")
else:
    print("Could not find required list in source")
