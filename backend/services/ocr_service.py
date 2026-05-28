"""HealthMitra Scan – OCR Service (Real Tesseract OCR with fallback)"""
import os
import re
import logging
from typing import List, Dict, Any

logger = logging.getLogger(__name__)

# ── Try to import real OCR libraries ────────────────────────────────
try:
    import pytesseract
    from PIL import Image
    TESSERACT_AVAILABLE = True
except ImportError:
    TESSERACT_AVAILABLE = False
    logger.warning("pytesseract / Pillow not installed. Using simulated OCR.")

try:
    from pdf2image import convert_from_path
    PDF_SUPPORT = True
except ImportError:
    PDF_SUPPORT = False
    logger.warning("pdf2image not installed. PDF OCR will not be available.")

try:
    import pdfplumber
    import pandas as pd
    STRUCTURED_PDF_SUPPORT = True
except ImportError:
    STRUCTURED_PDF_SUPPORT = False
    logger.warning("pdfplumber/pandas not installed. Structured PDF parsing limited.")

from services.clinical_engine import process_clinical_results, ClinicalReport

# ── Configure Tesseract path (Windows) ──────────────────────────────
if TESSERACT_AVAILABLE:
    try:
        from config import TESSERACT_CMD
        if os.path.exists(TESSERACT_CMD):
            pytesseract.pytesseract.tesseract_cmd = TESSERACT_CMD
    except Exception:
        pass  # Use default system PATH


# ── Medical value parsing for risk assessment ───────────────────────
MEDICAL_PATTERNS = {
    "Hemoglobin": {
        "pattern": r"(?:\bhemoglobin\b|\bhb\b|\bhgb\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (12.0, 17.0),
        "unit": "g/dL"
    },
    "Fasting Blood Sugar": {
        "pattern": r"(?:\bfasting\s*blood\s*sugar\b|\bfbs\b|\bglucose\s*fasting\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (70.0, 100.0),
        "unit": "mg/dL"
    },
    "HbA1c": {
        "pattern": r"(?:\bhba1c\b|\bglycated\s*hemoglobin\b|\ba1c\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (4.0, 5.7),
        "unit": "%"
    },
    "Total Cholesterol": {
        "pattern": r"(?<!hdl\s)(?<!ldl\s)\bcholesterol\b(?![\s,:\(\)\/\.\-a-z]*ratio)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 200.0),
        "unit": "mg/dL"
    },
    "LDL Cholesterol": {
        "pattern": r"(?:\bldl\b|low\s*density|\bldl\s*cholesterol\b|\bldl\-c\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 100.0),
        "unit": "mg/dL"
    },
    "HDL Cholesterol": {
        "pattern": r"(?:\bhdl\b|high\s*density|\bhdl\s*cholesterol\b|\bhdl\-c\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (40.0, 100.0),
        "unit": "mg/dL"
    },
    "Triglycerides": {
        "pattern": r"(?:\btriglycerides\b|\btriglyceride\b|\btg\b|\btrig\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 150.0),
        "unit": "mg/dL"
    },
    "Lp(a)": {
        "pattern": r"(?:lp\(a\)|lipoprotein\s*\(a\))[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 72.0),
        "unit": "nmol/L"
    },
    "Homocysteine": {
        "pattern": r"(?:\bhomocysteine\b|\bhcy\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 15.0),
        "unit": "µmol/L"
    },
    "eGFR": {
        "pattern": r"(?:\begfr\b|estimated\s*gfr|\bgfr\b)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (60.0, 200.0),
        "unit": "mL/min/1.73m²"
    },
    "SGPT": {
        "pattern": r"(?:\bsgpt\b|\balt\b|alanine)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (7.0, 56.0),
        "unit": "U/L"
    },
    "SGOT": {
        "pattern": r"(?:\bsgot\b|\bast\b|aspartate)[\s,:\(\)\/\.\-a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (10.0, 40.0),
        "unit": "U/L"
    },
    "WBC": {
        "pattern": r"(?:\bwbc\b|white\s*blood\s*cell|leucocyte)[\s,:\(\)a-z]{0,25}?(?<![a-z])(\d+)\b",
        "normal_range": (4000.0, 11000.0),
        "unit": "/cumm"
    },
    "TSH": {
        "pattern": r"(?:\btsh\b|thyroid\s*stimulating)[\s,:\(\)a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.4, 4.0),
        "unit": "mIU/L"
    },
    "Vitamin D": {
        "pattern": r"(?:vitamin\s*d|vit\s*d|25-oh)[\s,:\(\)a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (30.0, 100.0),
        "unit": "ng/mL"
    },
    "Vitamin B12": {
        "pattern": r"(?:vitamin\s*b12|vit\s*b12|cobalamin)[\s,:\(\)a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (197.0, 771.0),
        "unit": "pg/mL"
    },
    # CBC Markers
    "RBC Count": {
        "pattern": r"(?:\brbc\b|red\s*blood\s*cell)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (3.9, 5.7),
        "unit": "million/mm³"
    },
    "Platelet Count": {
        "pattern": r"(?:platelet|plt)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (150.0, 450.0),
        "unit": "x10³/µL"
    },
    "Hematocrit": {
        "pattern": r"(?:hct|hematocrit|pcv)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (36.0, 50.0),
        "unit": "%"
    },
    "MCV": {
        "pattern": r"(?:\bmcv\b)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (80.0, 100.0),
        "unit": "fL"
    },
    "MCH": {
        "pattern": r"(?:\bmch\b)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (27.0, 31.0),
        "unit": "pg"
    },
    "MCHC": {
        "pattern": r"(?:\bmchc\b)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (32.0, 36.0),
        "unit": "g/dL"
    },
    # LFT Markers
    "Total Bilirubin": {
        "pattern": r"(?:total\s*bilirubin|bilirubin\s*total)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.1, 1.2),
        "unit": "mg/dL"
    },
    "Direct Bilirubin": {
        "pattern": r"(?:direct\s*bilirubin|conjugated\s*bilirubin)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.0, 0.3),
        "unit": "mg/dL"
    },
    "Indirect Bilirubin": {
        "pattern": r"(?:indirect\s*bilirubin|unconjugated\s*bilirubin)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.2, 0.8),
        "unit": "mg/dL"
    },
    "ALP": {
        "pattern": r"(?:\balp\b|alkaline\s*phosphatase)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (40.0, 130.0),
        "unit": "U/L"
    },
    "Total Protein": {
        "pattern": r"(?:total\s*protein|protein\s*total)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (6.0, 8.3),
        "unit": "g/dL"
    },
    "Albumin": {
        "pattern": r"(?<!micro)(?<!micro\s)(?<!\bof\s)\balbumin\b(?![\s,:\(\)a-z]*excretion)(?![\s,:\(\)a-z]*ratio)(?![\s,:\(\)a-z]*cr)[\s,:\(\)a-z]{0,20}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (3.5, 5.5),
        "unit": "g/dL"
    },
    "Globulin": {
        "pattern": r"(?:globulin)[^0-9]*?\s*(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (2.0, 3.5),
        "unit": "g/dL"
    },
    # KFT Markers
    "Urea": {
        "pattern": r"(?<!ratio of\s)(?:urea|blood\s*urea(?![\s,:\(\)a-z]*ratio))[\s,:\(\)a-z]{0,20}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (15.0, 45.0),
        "unit": "mg/dL"
    },
    "Creatinine": {
        "pattern": r"(?<!albumin[:\-])(?<!ratio of\s)(?:serum\s*creatinine|creatinine(?![\s,:\(\)a-z]*ratio))[\s,:\(\)a-z]{0,20}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (0.7, 1.3),
        "unit": "mg/dL"
    },
    "Uric Acid": {
        "pattern": r"(?:uric\s*acid)[\s,:\(\)a-z]{0,25}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (2.6, 7.2),
        "unit": "mg/dL"
    },
    "BUN": {
        "pattern": r"(?:blood\s*urea\s*nitrogen|\bbun\b(?![\s,:\(\)a-z]*ratio))[\s,:\(\)a-z]{0,20}?(?<![a-z])(\d+\.?\d*)\b",
        "normal_range": (7.0, 20.0),
        "unit": "mg/dL"
    },
}


def _parse_medical_values(text: str) -> dict:
    """Parse medical values from OCR text and assess abnormalities."""
    findings = []
    abnormal_count = 0
    total_checked = 0

    text_lower = text.lower()

    for name, config in MEDICAL_PATTERNS.items():
        match = re.search(config["pattern"], text_lower)
        if match:
            try:
                value_str = match.group(1).replace(",", "")
                value = float(value_str)
                low, high = config["normal_range"]
                total_checked += 1

                status = "normal"
                if value < low:
                    status = "low"
                    abnormal_count += 1
                elif value > high:
                    status = "high"
                    abnormal_count += 1

                findings.append({
                    "parameter": name,
                    "value": value,
                    "unit": config["unit"],
                    "normal_range": f"{low}-{high}",
                    "status": status
                })
            except (ValueError, IndexError):
                continue

    # Calculate risk score based on abnormal findings
    if total_checked > 0:
        risk_ratio = abnormal_count / total_checked
        risk_score = min(int(risk_ratio * 100), 100)
    else:
        risk_score = 0

    if risk_score >= 60:
        risk_level = "high"
    elif risk_score >= 30:
        risk_level = "moderate"
    else:
        risk_level = "low"

    return {
        "findings": findings,
        "abnormal_count": abnormal_count,
        "total_checked": total_checked,
        "risk_score": risk_score,
        "risk_level": risk_level
    }


def _extract_structured_from_pdf(file_path: str) -> List[Dict[str, Any]]:
    """Extract structured table data from PDF using pdfplumber."""
    if not STRUCTURED_PDF_SUPPORT:
        return []
    
    findings = []
    try:
        with pdfplumber.open(file_path) as pdf:
            for page in pdf.pages:
                tables = page.extract_tables()
                for table in tables:
                    if not table: continue
                    # Simple heuristic: look for value-like things
                    df = pd.DataFrame(table)
                    # Often first row is header
                    for _, row in df.iterrows():
                        row_list = [str(cell).strip() if cell else "" for cell in row]
                        # Look for parameter-value pairs using regex
                        row_text = " ".join(row_list).lower()
                        for name, config in MEDICAL_PATTERNS.items():
                            match = re.search(config["pattern"], row_text)
                            if match:
                                try:
                                    # Prioritize the captured group from the specific pattern
                                    val = float(match.group(1).replace(",", ""))
                                except (IndexError, ValueError, AttributeError):
                                    # Fallback: look for the first numeric value in any cell of the row
                                    val = None
                                    for cell in row_list:
                                        num_match = re.search(r"(\d+\.?\d*)", cell)
                                        if num_match:
                                            val = float(num_match.group(1))
                                            break
                                
                                if val is not None:
                                    # Normalization for Platelets (150,000 -> 150)
                                    if name == "Platelet Count" and val > 1000:
                                        val = val / 1000
                                            
                                    findings.append({
                                        "parameter": name,
                                        "value": val,
                                        "unit": config["unit"],
                                        "lab_reference_range": str(config.get("normal_range")),
                                        "section": "Laboratory"
                                    })
                                    break
        return findings
    except Exception as e:
        logger.error(f"Structured PDF extraction error: {e}")
        return []

def _ocr_from_image(file_path: str) -> str:
    """Extract text from an image file using Tesseract."""
    try:
        image = Image.open(file_path)
        # Use English + Hindi language data if available
        try:
            text = pytesseract.image_to_string(image, lang="eng+hin")
        except pytesseract.TesseractError:
            text = pytesseract.image_to_string(image, lang="eng")
        return text.strip()
    except Exception as e:
        logger.error(f"OCR image extraction error: {e}")
        return ""


def _ocr_from_pdf(file_path: str) -> str:
    """Extract text from a PDF file by converting pages to images first."""
    if not PDF_SUPPORT:
        logger.warning("pdf2image not available for PDF OCR")
        return ""
    try:
        images = convert_from_path(file_path)
        all_text = []
        for page_img in images:
            try:
                text = pytesseract.image_to_string(page_img, lang="eng+hin")
            except pytesseract.TesseractError:
                text = pytesseract.image_to_string(page_img, lang="eng")
            all_text.append(text.strip())
        return "\n\n".join(all_text)
    except Exception as e:
        logger.error(f"OCR PDF extraction error: {e}")
        return ""


def _text_from_pdf(file_path: str) -> str:
    """Extract raw searchable text from a PDF file using pdfplumber."""
    if not STRUCTURED_PDF_SUPPORT:
        return ""
    try:
        with pdfplumber.open(file_path) as pdf:
            all_text = []
            for page in pdf.pages:
                text = page.extract_text()
                if text: all_text.append(text)
            return "\n\n".join(all_text)
    except Exception as e:
        logger.error(f"Text-based PDF extraction error: {e}")
        return ""


def extract_text_from_file(file_path: str) -> dict:
    """
    Unified extraction pipeline for HealthMitra Report Intelligence Engine.
    Pipeline: Structured PDF -> OCR -> Deterministic Validation.
    """
    ext = os.path.splitext(file_path)[1].lower()
    structured_findings = []
    raw_text = ""

    # 1. Try Structured PDF Extraction (Primary)
    if ext == ".pdf" and STRUCTURED_PDF_SUPPORT:
        structured_findings = _extract_structured_from_pdf(file_path)
        
        # Also try Raw Text Extraction (Secondary)
        logger.info("Running parallel raw text extraction for additional coverage.")
        raw_text = _text_from_pdf(file_path)
        if raw_text:
            lines = raw_text.split('\n')
            for line in lines:
                line_lower = line.lower()
                for name, config in MEDICAL_PATTERNS.items():
                    # Skip if already found with a value from structured (tables usually more precise)
                    if any(f["parameter"] == name for f in structured_findings):
                        continue
                        
                    # Look for markers in the line
                    match = re.search(config["pattern"], line_lower)
                    if match:
                        try:
                            val = float(match.group(1).replace(",", ""))
                            # Normalize Platelets (often given as 250,000 instead of 250)
                            if name == "Platelet Count" and val > 1000:
                                val = val / 1000
                                
                            structured_findings.append({
                                "parameter": name,
                                "value": val,
                                "unit": config["unit"],
                                "lab_reference_range": str(config["normal_range"]),
                                "section": "Laboratory"
                            })
                        except: continue

    # 2. Try OCR (Final Fallback for images or non-text PDFs)
    if not structured_findings or ext in (".png", ".jpg", ".jpeg"):
        if ext == ".pdf":
            raw_text = _ocr_from_pdf(file_path)
        else:
            raw_text = _ocr_from_image(file_path)
        
        # Parse medical values from raw text if structured extraction didn't find anything
        if raw_text:
            text_lower = raw_text.lower()
            for name, config in MEDICAL_PATTERNS.items():
                match = re.search(config["pattern"], text_lower)
                if match:
                    try:
                        val = float(match.group(1).replace(",", ""))
                        structured_findings.append({
                            "parameter": name,
                            "value": val,
                            "unit": config["unit"],
                            "lab_reference_range": str(config["normal_range"]),
                            "section": "Laboratory"
                        })
                    except: continue

    # 3. Deterministic Validation & Clinical Classification
    if not structured_findings:
        return {
            "error": "Report could not be reliably parsed. Please upload a clearer version.",
            "status": "fail"
        }

    # Pass to Clinical Engine
    clinical_report: ClinicalReport = process_clinical_results(structured_findings)

    return {
        "report": clinical_report.model_dump(),
        "ocr_text": raw_text or "Structured Data (No OCR needed)",
        "risk_score": clinical_report.risk_scores.get("cardiovascular", {}).get("score", 0),
        "risk_level": clinical_report.risk_scores.get("cardiovascular", {}).get("level", "Unknown").lower(),
        "confidence": 1.0 if structured_findings else 0.7,
        "source": "structured_pdf" if not raw_text else "ocr_engine"
    }
