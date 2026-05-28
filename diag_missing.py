import pdfplumber
import re

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\Report-2429011568-1.pdf'

keywords = [
    "hematocrit", "pcv", "packed cell volume",
    "mcv", "mean corpuscular volume",
    "mch", "mean corpuscular hemoglobin",
    "mchc",
    "bun", "blood urea nitrogen",
    "creatinine",
    "protein",
    "globulin",
    "vitamin b12", "b12",
    "alp", "alkaline phosphatase"
]

def diagnostic():
    print(f"Searching for keywords in: {file_path}")
    with pdfplumber.open(file_path) as pdf:
        for i, page in enumerate(pdf.pages):
            text = page.extract_text()
            if not text: continue
            lines = text.split('\n')
            for line_no, line in enumerate(lines):
                line_lower = line.lower()
                for kw in keywords:
                    if kw in line_lower:
                        print(f"Page {i+1}, Line {line_no}: {line.strip()}")

if __name__ == "__main__":
    diagnostic()
