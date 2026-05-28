"""HealthMitra Scan – Reports Router"""
import os
import json
import logging
import traceback
import asyncio
from concurrent.futures import ThreadPoolExecutor
from fastapi import APIRouter, UploadFile, File, Depends, Form, HTTPException
from sqlalchemy.orm import Session
from database import get_db, SessionLocal
from models import MedicalReport, HealthTimeline
from services.ocr_service import extract_text_from_file
from services.llm_service import explain_report
from services.alert_service import check_emergency_from_text
from config import UPLOAD_DIR

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/reports", tags=["Medical Reports"])

# Thread pool for blocking OCR / LLM calls
_pool = ThreadPoolExecutor(max_workers=2)


@router.post("/upload")
async def upload_report(
    file: UploadFile = File(...),
    patient_id: int = Form(None),
    language: str = Form("en"),
):
    """Upload a medical report (PDF/image), extract text via OCR, and explain it."""
    try:
        # Save uploaded file
        os.makedirs(UPLOAD_DIR, exist_ok=True)
        file_path = os.path.join(UPLOAD_DIR, file.filename)
        with open(file_path, "wb") as f:
            content = await file.read()
            f.write(content)

        loop = asyncio.get_event_loop()

        # Unified Clinical Pipeline (blocking → run in thread)
        logger.info(f"Starting OCR/Extraction for {file.filename}...")
        ocr_result = await loop.run_in_executor(_pool, extract_text_from_file, file_path)
        logger.info(f"OCR/Extraction complete for {file.filename}. Status: {'error' if 'error' in ocr_result else 'success'}")
        
        if "error" in ocr_result:
             raise HTTPException(status_code=422, detail=ocr_result["error"])

        logger.info(f"Clinical Engine done. Risk={ocr_result.get('risk_level')}")

        # LLM explanation based on structured data (blocking → run in thread)
        logger.info(f"Starting LLM explanation (EN) for {file.filename}...")
        explanation_en = await loop.run_in_executor(
            _pool, explain_report, ocr_result["report"], "en"
        )
        logger.info(f"LLM explanation (EN) complete for {file.filename}")

        logger.info(f"Starting LLM explanation (HI) for {file.filename}...")
        explanation_hi = await loop.run_in_executor(
            _pool, explain_report, ocr_result["report"], "hi"
        )
        logger.info(f"LLM explanation (HI) complete for {file.filename}")

        # Save to database
        db = SessionLocal()
        try:
            report = MedicalReport(
                user_id=patient_id, # Mapping patient_id from form to user_id for simplicity or as allowed
                filename=file.filename,
                ocr_text=ocr_result["ocr_text"],
                explanation_en=explanation_en,
                explanation_hi=explanation_hi,
                risk_score=ocr_result["risk_score"],
                risk_level=ocr_result["risk_level"],
                structured_data=json.dumps(ocr_result["report"]),
                remedies=json.dumps(ocr_result["report"].get("remedies", [])),
                critical_alerts=json.dumps(ocr_result["report"].get("red_flags", []))
            )
            db.add(report)
            db.commit()
            db.refresh(report)

            # Add to health timeline
            timeline_entry = HealthTimeline(
                user_id=patient_id,
                event_type="report",
                title=f"Medical Analysis: {file.filename}",
                description=f"Confidence: {ocr_result['confidence']*100}% | Risk: {ocr_result['risk_level'].title()}",
                risk_score=ocr_result["risk_score"],
                data_json=json.dumps({"report_id": report.id})
            )
            db.add(timeline_entry)
            db.commit()

            report_id = report.id
        finally:
            db.close()

        return {
            "id": report_id,
            "filename": file.filename,
            "ocr_text": ocr_result["ocr_text"],
            "report": ocr_result["report"],
            "explanation_en": explanation_en,
            "explanation_hi": explanation_hi,
            "risk_score": ocr_result["risk_score"],
            "risk_level": ocr_result["risk_level"],
            "confidence": ocr_result["confidence"]
        }

    except Exception as e:
        logger.error(f"Report upload failed: {e}")
        logger.error(traceback.format_exc())
        raise HTTPException(status_code=500, detail=f"Report processing failed: {str(e)}")


@router.get("/history")
def get_report_history(patient_id: int = None, db: Session = Depends(get_db)):
    """Get report history, optionally filtered by patient."""
    query = db.query(MedicalReport)
    if patient_id:
        query = query.filter(MedicalReport.patient_id == patient_id)
    reports = query.order_by(MedicalReport.created_at.desc()).limit(50).all()

    return [{
        "id": r.id,
        "filename": r.filename,
        "risk_score": r.risk_score,
        "risk_level": r.risk_level,
        "created_at": r.created_at.isoformat() if r.created_at else None
    } for r in reports]


@router.get("/{report_id}")
def get_report(report_id: int, db: Session = Depends(get_db)):
    """Get a specific report by ID."""
    report = db.query(MedicalReport).filter(MedicalReport.id == report_id).first()
    if not report:
        return {"error": "Report not found"}

    return {
        "id": report.id,
        "filename": report.filename,
        "ocr_text": report.ocr_text,
        "explanation_en": report.explanation_en,
        "explanation_hi": report.explanation_hi,
        "risk_score": report.risk_score,
        "risk_level": report.risk_level,
        "critical_alerts": json.loads(report.critical_alerts) if report.critical_alerts else [],
        "created_at": report.created_at.isoformat() if report.created_at else None
    }
