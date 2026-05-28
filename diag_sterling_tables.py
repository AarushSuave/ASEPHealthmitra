import pdfplumber
import pandas as pd
import sys
import os

file_path = r'c:\Users\Amit\Downloads\healthmitra-scan-master\healthmitra-scan-master\backend\uploads\sterling-accuris-pathology-sample-report-unlocked.pdf'
log_file = 'diag_sterling_tables.txt'

def diagnostic():
    with open(log_file, 'w', encoding='utf-8') as f:
        with pdfplumber.open(file_path) as pdf:
            # Page 11 is where Creatinine is
            page = pdf.pages[10] # 0-indexed
            f.write(f"--- PAGE 11 RAW TEXT ---\n")
            f.write(page.extract_text() or "No text")
            f.write("\n\n")
            
            f.write(f"--- PAGE 11 TABLES ---\n")
            tables = page.extract_tables()
            for i, table in enumerate(tables):
                f.write(f"\nTable {i+1}:\n")
                if table:
                    df = pd.DataFrame(table)
                    f.write(df.to_string())
                    f.write("\n")

if __name__ == "__main__":
    diagnostic()
