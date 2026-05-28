import pdfplumber
import re
import sys
import os

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\sterling-accuris-pathology-sample-report-unlocked.pdf'
log_file = 'diag_sterling.txt'

def diagnostic():
    with open(log_file, 'w', encoding='utf-8') as f:
        f.write(f"Analyzing PDF: {file_path}\n\n")
        with pdfplumber.open(file_path) as pdf:
            for i, page in enumerate(pdf.pages):
                text = page.extract_text()
                f.write(f"--- PAGE {i+1} ---\n")
                if text:
                    f.write(text)
                    f.write("\n\n")
                    
                    # Search specifically for Creatinine variants
                    lines = text.split('\n')
                    for line in lines:
                        if 'creatinine' in line.lower():
                            f.write(f"MATCHED LINE: {line.strip()}\n")
                
                # Check tables too
                tables = page.extract_table()
                if tables:
                    f.write(f"--- PAGE {i+1} TABLE ---\n")
                    for row in tables:
                        f.write(str(row) + "\n")

if __name__ == "__main__":
    diagnostic()
