"""Generate 5 professional lab report PDFs for OCR testing."""
from reportlab.lib.pagesizes import A4
from reportlab.lib.units import mm, cm
from reportlab.lib.colors import HexColor, black, white
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Spacer, Paragraph, HRFlowable
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.enums import TA_CENTER, TA_LEFT, TA_RIGHT
import os

OUTPUT_DIR = os.path.join(os.path.dirname(__file__), "test", "sample_reports")
os.makedirs(OUTPUT_DIR, exist_ok=True)

# ── 5 Lab Profiles ──────────────────────────────────────────────────
LABS = [
    {
        "name": "Sterling Accuris Diagnostics",
        "tagline": "NABL Accredited | ISO 15189:2022 Certified",
        "address": "Plot 12, Saket Nagar, Indore, MP 452018",
        "phone": "+91-731-4200100",
        "color": "#1a5276",
        "report_title": "COMPREHENSIVE HEALTH CHECKUP",
        "patient": {"name": "Rajesh Kumar Sharma", "age": "52", "gender": "Male", "id": "SA-2026-78432"},
        "doctor": "Dr. Meena Patel",
        "date": "15-Jun-2026",
        "tests": [
            ("COMPLETE BLOOD COUNT (CBC)", [
                ("Hemoglobin", "11.2", "g/dL", "13.0 - 17.0"),
                ("RBC Count", "4.1", "million/mm3", "4.5 - 5.5"),
                ("WBC", "7200", "/cumm", "4000 - 11000"),
                ("Platelet Count", "210", "x10^3/uL", "150 - 450"),
                ("Hematocrit", "38.5", "%", "40 - 50"),
                ("MCV", "93.9", "fL", "80 - 100"),
                ("MCH", "27.3", "pg", "27 - 31"),
                ("MCHC", "29.1", "g/dL", "32 - 36"),
            ]),
            ("LIPID PROFILE", [
                ("Total Cholesterol", "248", "mg/dL", "< 200"),
                ("LDL Cholesterol", "165", "mg/dL", "< 100"),
                ("HDL Cholesterol", "38", "mg/dL", "> 40"),
                ("Triglycerides", "225", "mg/dL", "< 150"),
            ]),
            ("DIABETES PANEL", [
                ("Fasting Blood Sugar", "142", "mg/dL", "70 - 100"),
                ("HbA1c", "7.2", "%", "< 5.7"),
            ]),
            ("LIVER FUNCTION TEST (LFT)", [
                ("Total Bilirubin", "0.9", "mg/dL", "0.1 - 1.2"),
                ("Conjugated Bilirubin", "0.2", "mg/dL", "0.0 - 0.3"),
                ("Unconjugated Bilirubin", "0.7", "mg/dL", "0.2 - 0.8"),
                ("SGPT (ALT)", "62", "U/L", "7 - 56"),
                ("SGOT (AST)", "48", "U/L", "10 - 40"),
                ("ALP (Alkaline Phosphatase)", "95", "U/L", "40 - 130"),
                ("Total Protein", "7.1", "g/dL", "6.0 - 8.3"),
                ("Albumin", "4.2", "g/dL", "3.5 - 5.5"),
                ("Globulin", "2.9", "g/dL", "2.0 - 3.5"),
            ]),
            ("KIDNEY FUNCTION TEST (KFT)", [
                ("Serum Creatinine", "1.4", "mg/dL", "0.7 - 1.3"),
                ("Uric Acid", "7.8", "mg/dL", "2.6 - 7.2"),
                ("BUN", "24", "mg/dL", "7 - 20"),
                ("Urea", "52", "mg/dL", "15 - 45"),
                ("eGFR", "55", "mL/min/1.73m2", "> 60"),
            ]),
        ]
    },
    {
        "name": "LifeCare Pathology Labs",
        "tagline": "Trusted Diagnostics Since 1998 | NABL Certified",
        "address": "22-B, MG Road, Andheri West, Mumbai 400058",
        "phone": "+91-22-26301500",
        "color": "#117a65",
        "report_title": "DIABETES AND CARDIAC RISK PANEL",
        "patient": {"name": "Priya Deshmukh", "age": "45", "gender": "Female", "id": "LC-2026-11290"},
        "doctor": "Dr. Anil Kapoor",
        "date": "16-Jun-2026",
        "tests": [
            ("DIABETES SCREENING", [
                ("Fasting Blood Sugar", "118", "mg/dL", "70 - 100"),
                ("HbA1c", "6.1", "%", "< 5.7"),
            ]),
            ("LIPID PROFILE", [
                ("Total Cholesterol", "215", "mg/dL", "< 200"),
                ("LDL Cholesterol", "138", "mg/dL", "< 100"),
                ("HDL Cholesterol", "52", "mg/dL", "> 50"),
                ("Triglycerides", "168", "mg/dL", "< 150"),
            ]),
            ("CARDIAC MARKERS", [
                ("Homocysteine", "18.5", "umol/L", "< 15"),
                ("Lp(a)", "88", "nmol/L", "< 72"),
            ]),
            ("THYROID PROFILE", [
                ("TSH", "5.8", "mIU/L", "0.4 - 4.0"),
            ]),
            ("VITAMINS", [
                ("Vitamin D", "18", "ng/mL", "30 - 100"),
                ("Vitamin B12", "185", "pg/mL", "197 - 771"),
            ]),
        ]
    },
    {
        "name": "MedScan Advanced Diagnostics",
        "tagline": "CAP Accredited | 24x7 Emergency Lab Services",
        "address": "Tower C, Cyber Hub, Gurugram, Haryana 122002",
        "phone": "+91-124-4567890",
        "color": "#6c3483",
        "report_title": "EXECUTIVE HEALTH PROFILE",
        "patient": {"name": "Amit Verma", "age": "38", "gender": "Male", "id": "MS-2026-55601"},
        "doctor": "Dr. Sunita Reddy",
        "date": "17-Jun-2026",
        "tests": [
            ("COMPLETE BLOOD COUNT (CBC)", [
                ("Hemoglobin", "15.2", "g/dL", "13.0 - 17.0"),
                ("RBC Count", "5.1", "million/mm3", "4.5 - 5.5"),
                ("WBC", "6800", "/cumm", "4000 - 11000"),
                ("Platelet Count", "285", "x10^3/uL", "150 - 450"),
                ("Hematocrit", "45.2", "%", "40 - 50"),
                ("MCV", "88.6", "fL", "80 - 100"),
                ("MCH", "29.8", "pg", "27 - 31"),
                ("MCHC", "33.6", "g/dL", "32 - 36"),
            ]),
            ("LIPID PROFILE", [
                ("Total Cholesterol", "192", "mg/dL", "< 200"),
                ("LDL Cholesterol", "110", "mg/dL", "< 100"),
                ("HDL Cholesterol", "55", "mg/dL", "> 40"),
                ("Triglycerides", "135", "mg/dL", "< 150"),
            ]),
            ("DIABETES PANEL", [
                ("Fasting Blood Sugar", "95", "mg/dL", "70 - 100"),
                ("HbA1c", "5.4", "%", "< 5.7"),
            ]),
            ("LIVER FUNCTION TEST (LFT)", [
                ("SGPT (ALT)", "32", "U/L", "7 - 56"),
                ("SGOT (AST)", "28", "U/L", "10 - 40"),
                ("Total Bilirubin", "0.8", "mg/dL", "0.1 - 1.2"),
                ("Conjugated Bilirubin", "0.2", "mg/dL", "0.0 - 0.3"),
                ("Unconjugated Bilirubin", "0.6", "mg/dL", "0.2 - 0.8"),
                ("ALP (Alkaline Phosphatase)", "78", "U/L", "40 - 130"),
                ("Total Protein", "7.4", "g/dL", "6.0 - 8.3"),
                ("Albumin", "4.5", "g/dL", "3.5 - 5.5"),
                ("Globulin", "2.9", "g/dL", "2.0 - 3.5"),
            ]),
            ("KIDNEY FUNCTION TEST (KFT)", [
                ("Urea", "28", "mg/dL", "15 - 45"),
                ("Creatinine", "0.9", "mg/dL", "0.7 - 1.3"),
                ("Uric Acid", "5.5", "mg/dL", "2.6 - 7.2"),
                ("eGFR", "98", "mL/min/1.73m2", "> 60"),
            ]),
            ("VITAMINS & THYROID", [
                ("TSH", "2.1", "mIU/L", "0.4 - 4.0"),
                ("Vitamin D", "42", "ng/mL", "30 - 100"),
                ("Vitamin B12", "450", "pg/mL", "197 - 771"),
            ]),
        ]
    },
    {
        "name": "Precision Diagnostic Centre",
        "tagline": "ISO 15189 Accredited | Serving Since 2005",
        "address": "14, Rajaji Nagar, Bangalore, Karnataka 560010",
        "phone": "+91-80-41234567",
        "color": "#c0392b",
        "report_title": "LIVER AND KIDNEY ASSESSMENT",
        "patient": {"name": "Sunanda Rao", "age": "60", "gender": "Female", "id": "PD-2026-33821"},
        "doctor": "Dr. Vikram Hegde",
        "date": "18-Jun-2026",
        "tests": [
            ("LIVER FUNCTION TEST (LFT)", [
                ("Total Bilirubin", "1.8", "mg/dL", "0.1 - 1.2"),
                ("Conjugated Bilirubin", "0.5", "mg/dL", "0.0 - 0.3"),
                ("Unconjugated Bilirubin", "1.3", "mg/dL", "0.2 - 0.8"),
                ("SGPT (ALT)", "85", "U/L", "7 - 56"),
                ("SGOT (AST)", "72", "U/L", "10 - 40"),
                ("ALP (Alkaline Phosphatase)", "145", "U/L", "40 - 130"),
                ("Total Protein", "5.8", "g/dL", "6.0 - 8.3"),
                ("Albumin", "3.2", "g/dL", "3.5 - 5.5"),
                ("Globulin", "2.6", "g/dL", "2.0 - 3.5"),
            ]),
            ("KIDNEY FUNCTION TEST (KFT)", [
                ("Serum Creatinine", "1.8", "mg/dL", "0.7 - 1.3"),
                ("Uric Acid", "8.5", "mg/dL", "2.6 - 6.0"),
                ("BUN", "30", "mg/dL", "7 - 20"),
                ("Urea", "65", "mg/dL", "15 - 45"),
                ("eGFR", "42", "mL/min/1.73m2", "> 60"),
            ]),
            ("COMPLETE BLOOD COUNT (CBC)", [
                ("Hemoglobin", "10.5", "g/dL", "12.0 - 15.0"),
                ("RBC Count", "3.6", "million/mm3", "3.9 - 5.0"),
                ("WBC", "12500", "/cumm", "4000 - 11000"),
                ("Platelet Count", "130", "x10^3/uL", "150 - 450"),
                ("Hematocrit", "33.5", "%", "36 - 46"),
            ]),
        ]
    },
    {
        "name": "VitaCheck Health Laboratories",
        "tagline": "NABL & ICMR Approved | Pan India Network",
        "address": "5th Floor, Unitech Tower, Sector 44, Noida 201301",
        "phone": "+91-120-6543210",
        "color": "#2471a3",
        "report_title": "VITAMIN DEFICIENCY AND METABOLIC PANEL",
        "patient": {"name": "Deepak Malhotra", "age": "34", "gender": "Male", "id": "VC-2026-90145"},
        "doctor": "Dr. Kavita Joshi",
        "date": "19-Jun-2026",
        "tests": [
            ("VITAMINS AND MINERALS", [
                ("Vitamin D", "12", "ng/mL", "30 - 100"),
                ("Vitamin B12", "142", "pg/mL", "197 - 771"),
            ]),
            ("THYROID PROFILE", [
                ("TSH", "6.2", "mIU/L", "0.4 - 4.0"),
            ]),
            ("DIABETES SCREENING", [
                ("Fasting Blood Sugar", "105", "mg/dL", "70 - 100"),
                ("HbA1c", "5.9", "%", "< 5.7"),
            ]),
            ("LIPID PROFILE", [
                ("Total Cholesterol", "230", "mg/dL", "< 200"),
                ("LDL Cholesterol", "155", "mg/dL", "< 100"),
                ("HDL Cholesterol", "35", "mg/dL", "> 40"),
                ("Triglycerides", "198", "mg/dL", "< 150"),
            ]),
            ("COMPLETE BLOOD COUNT (CBC)", [
                ("Hemoglobin", "12.8", "g/dL", "13.0 - 17.0"),
                ("RBC Count", "4.3", "million/mm3", "4.5 - 5.5"),
                ("WBC", "5600", "/cumm", "4000 - 11000"),
                ("Platelet Count", "320", "x10^3/uL", "150 - 450"),
                ("Hematocrit", "39.2", "%", "40 - 50"),
                ("MCV", "91.2", "fL", "80 - 100"),
                ("MCH", "29.8", "pg", "27 - 31"),
                ("MCHC", "32.7", "g/dL", "32 - 36"),
            ]),
            ("CARDIAC MARKERS", [
                ("Homocysteine", "22", "umol/L", "< 15"),
                ("Lp(a)", "95", "nmol/L", "< 72"),
            ]),
            ("KIDNEY FUNCTION TEST (KFT)", [
                ("Urea", "35", "mg/dL", "15 - 45"),
                ("Creatinine", "1.0", "mg/dL", "0.7 - 1.3"),
                ("eGFR", "92", "mL/min/1.73m2", "> 60"),
            ]),
        ]
    },
]


def build_pdf(lab, filename):
    """Build a single professional lab report PDF."""
    path = os.path.join(OUTPUT_DIR, filename)
    doc = SimpleDocTemplate(path, pagesize=A4,
                            topMargin=15*mm, bottomMargin=15*mm,
                            leftMargin=15*mm, rightMargin=15*mm)
    styles = getSampleStyleSheet()
    accent = HexColor(lab["color"])
    elements = []

    # ── Styles ───────────────────────────────────────────────────────
    s_lab = ParagraphStyle("LabName", parent=styles["Title"],
                           fontSize=18, textColor=accent, spaceAfter=2,
                           alignment=TA_CENTER, fontName="Helvetica-Bold")
    s_tag = ParagraphStyle("Tagline", parent=styles["Normal"],
                           fontSize=9, textColor=HexColor("#555555"),
                           alignment=TA_CENTER, spaceAfter=1)
    s_addr = ParagraphStyle("Addr", parent=styles["Normal"],
                            fontSize=8, textColor=HexColor("#777777"),
                            alignment=TA_CENTER, spaceAfter=6)
    s_title = ParagraphStyle("RTitle", parent=styles["Heading2"],
                             fontSize=13, textColor=white, spaceAfter=0,
                             alignment=TA_CENTER, fontName="Helvetica-Bold")
    s_section = ParagraphStyle("Section", parent=styles["Heading3"],
                               fontSize=11, textColor=accent,
                               fontName="Helvetica-Bold", spaceBefore=10, spaceAfter=4)
    s_cell = ParagraphStyle("Cell", parent=styles["Normal"], fontSize=9,
                            fontName="Helvetica", leading=12)
    s_cell_bold = ParagraphStyle("CellB", parent=s_cell, fontName="Helvetica-Bold")
    s_footer = ParagraphStyle("Footer", parent=styles["Normal"],
                              fontSize=7, textColor=HexColor("#999999"),
                              alignment=TA_CENTER, spaceBefore=15)

    # ── Header ───────────────────────────────────────────────────────
    elements.append(Paragraph(lab["name"], s_lab))
    elements.append(Paragraph(lab["tagline"], s_tag))
    elements.append(Paragraph(f'{lab["address"]}  |  {lab["phone"]}', s_addr))
    elements.append(HRFlowable(width="100%", thickness=2, color=accent, spaceAfter=6))

    # ── Report Title Banner ──────────────────────────────────────────
    title_table = Table([[Paragraph(lab["report_title"], s_title)]],
                        colWidths=[doc.width])
    title_table.setStyle(TableStyle([
        ("BACKGROUND", (0, 0), (-1, -1), accent),
        ("TOPPADDING", (0, 0), (-1, -1), 6),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(title_table)
    elements.append(Spacer(1, 6))

    # ── Patient Info ─────────────────────────────────────────────────
    p = lab["patient"]
    info_data = [
        [Paragraph("<b>Patient Name:</b>", s_cell), Paragraph(p["name"], s_cell),
         Paragraph("<b>Report Date:</b>", s_cell), Paragraph(lab["date"], s_cell)],
        [Paragraph("<b>Age / Gender:</b>", s_cell), Paragraph(f'{p["age"]} Yrs / {p["gender"]}', s_cell),
         Paragraph("<b>Ref. Doctor:</b>", s_cell), Paragraph(lab["doctor"], s_cell)],
        [Paragraph("<b>Patient ID:</b>", s_cell), Paragraph(p["id"], s_cell),
         Paragraph("<b>Lab Name:</b>", s_cell), Paragraph(lab["name"], s_cell)],
    ]
    info_tbl = Table(info_data, colWidths=[doc.width*0.18, doc.width*0.32,
                                           doc.width*0.18, doc.width*0.32])
    info_tbl.setStyle(TableStyle([
        ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
        ("BACKGROUND", (0, 0), (0, -1), HexColor("#f0f0f0")),
        ("BACKGROUND", (2, 0), (2, -1), HexColor("#f0f0f0")),
        ("TOPPADDING", (0, 0), (-1, -1), 4),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
        ("LEFTPADDING", (0, 0), (-1, -1), 6),
    ]))
    elements.append(info_tbl)
    elements.append(Spacer(1, 8))

    # ── Test Sections ────────────────────────────────────────────────
    for section_name, tests in lab["tests"]:
        elements.append(Paragraph(section_name, s_section))

        header = [
            Paragraph("<b>Test Parameter</b>", s_cell_bold),
            Paragraph("<b>Result</b>", s_cell_bold),
            Paragraph("<b>Unit</b>", s_cell_bold),
            Paragraph("<b>Reference Range</b>", s_cell_bold),
        ]
        rows = [header]
        for test_name, value, unit, ref in tests:
            rows.append([
                Paragraph(test_name, s_cell),
                Paragraph(f"<b>{value}</b>", s_cell),
                Paragraph(unit, s_cell),
                Paragraph(ref, s_cell),
            ])

        tbl = Table(rows, colWidths=[doc.width*0.35, doc.width*0.18,
                                     doc.width*0.22, doc.width*0.25])
        tbl.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), HexColor("#e8e8e8")),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#cccccc")),
            ("TOPPADDING", (0, 0), (-1, -1), 3),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("VALIGN", (0, 0), (-1, -1), "MIDDLE"),
        ]))
        elements.append(tbl)

    # ── Footer ───────────────────────────────────────────────────────
    elements.append(HRFlowable(width="100%", thickness=1, color=HexColor("#cccccc"), spaceBefore=12))
    elements.append(Paragraph(
        f"Report generated by {lab['name']}. "
        "This is a computer-generated report and does not require a signature. "
        "For clinical decisions, consult your physician.", s_footer))

    doc.build(elements)
    print(f"  [OK] {filename}")
    return path


if __name__ == "__main__":
    print("Generating 5 sample lab reports...\n")
    files = []
    for i, lab in enumerate(LABS):
        safe = lab["name"].replace(" ", "_")
        fname = f"{safe}_Report.pdf"
        files.append(build_pdf(lab, fname))
    print(f"\nAll reports saved to: {OUTPUT_DIR}")
    for f in files:
        print(f"  -> {os.path.basename(f)}")
