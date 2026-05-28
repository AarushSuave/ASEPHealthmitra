import sys
import pdfplumber

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\Report-2429011568-1.pdf'

try:
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if text:
                text_lower = text.lower()
                for marker in ["cholesterol", "ldl", "hdl", "triglycerides", "lipid", "homocysteine", "lp(a)", "tsh"]:
                    if marker in text_lower:
                        print(f"--- FOUND {marker} ON PAGE {i+1} ---")
                        lines = text.split('\n')
                        for k, line in enumerate(lines):
                            if marker in line.lower():
                                print(f"  --- {marker} ---")
                                for m in range(max(0, k-1), min(len(lines), k+6)):
                                    print(f"    Line {m}: {lines[m].strip()}")
except Exception as e:
    print(f"Error: {e}")
