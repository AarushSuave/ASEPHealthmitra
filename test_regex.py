import re

line = "Creatinine, Serum 0.83 mg/dL 0.66 - 1.25"
line_lower = line.lower()

pattern = r"(?<!albumin[:\-])(?<!ratio of\s)(?:serum\s*creatinine|creatinine(?![\s,:\(\)a-z]*ratio))[\s,:\(\)a-z]{0,20}?(?<![a-z])(\d+\.?\d*)\b"

match = re.search(pattern, line_lower)
if match:
    print(f"MATCHED: '{match.group(0)}'")
    print(f"VALUE: {match.group(1)}")
else:
    print("NO MATCH")

# Test with ratio of albumin:creatinine of 300
ratio_300_line = "A ratio of albumin:creatinine of 300 or higher is indicative of overt proteinuria."
match_300 = re.search(pattern, ratio_300_line.lower())
if match_300:
    print(f"RATIO 300 MATCHED: '{match_300.group(0)}'")
    print(f"RATIO 300 VALUE: {match_300.group(1)}")
else:
    print("RATIO 300 NO MATCH (GOOD)")

# Test with mg/g creatinine
mgg_line = "excretion is below 17 mg/g creatinine for males"
match_mgg = re.search(pattern, mgg_line.lower())
if match_mgg:
    print(f"MG/G MATCHED: '{match_mgg.group(0)}'")
else:
    print("MG/G NO MATCH (GOOD)")

