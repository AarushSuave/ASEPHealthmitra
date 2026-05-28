"""HealthMitra Scan – X-Ray Sequential AI Agent
Orchestrates the fixed pipeline:
  Step 1 → XRayViewValidator
  Step 2 → PneumoniaDetector
  Step 3 → FractureDetector
  Step 4 → XRayReportSynthesizer (bilingual LLM report)

Singletons are instantiated once at module-import time so heavy models
are only loaded on first request, not per-call.
"""
import logging
import time
from concurrent.futures import ThreadPoolExecutor, as_completed

logger = logging.getLogger(__name__)

# ── Lazy singletons ───────────────────────────────────────────────────────────
_view_validator   = None
_pneumonia_detector = None
_fracture_detector  = None

_init_pool = ThreadPoolExecutor(max_workers=3, thread_name_prefix="xray-init")


def _get_view_validator():
    global _view_validator
    if _view_validator is None:
        from services.xray_view_validator import XRayViewValidator
        _view_validator = XRayViewValidator()
        logger.info("XRayViewValidator singleton created.")
    return _view_validator


def _get_pneumonia_detector():
    global _pneumonia_detector
    if _pneumonia_detector is None:
        from services.pneumonia_detector import PneumoniaDetector
        _pneumonia_detector = PneumoniaDetector()
        logger.info("PneumoniaDetector singleton created.")
    return _pneumonia_detector


def _get_fracture_detector():
    global _fracture_detector
    if _fracture_detector is None:
        from services.fracture_detector import FractureDetector
        _fracture_detector = FractureDetector()
        logger.info("FractureDetector singleton created.")
    return _fracture_detector


# ── Agent entry point ─────────────────────────────────────────────────────────

def run_xray_agent(image_bytes: bytes) -> dict:
    """
    Runs the sequential X-ray analysis pipeline.

    Returns:
        {
          "success": bool,
          "error_message": str | None,
          "view": dict,
          "pneumonia": dict,
          "fracture": dict,
          "report": str,
          "report_en": str,
          "report_hi": str,
          "report_provider": str,
          "pipeline_timings": dict,   # ms per stage
        }
    """
    timings = {}

    # ── Step 1: Validate view ────────────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        view_result = _get_view_validator().validate(image_bytes)
    except Exception as e:
        logger.error(f"View validation crashed: {e}")
        view_result = {
            "valid": False,
            "view": "Unknown",
            "confidence": 0.0,
            "message": f"View validator error: {e}",
            "warnings": [str(e)]
        }
    timings["view_validation_ms"] = round((time.perf_counter() - t0) * 1000, 1)

    if not view_result.get("valid", False):
        # Hard stop – do not process non-frontal images
        return {
            "success": False,
            "error_message": (
                "The uploaded image does not appear to be a frontal (AP/PA) chest X-ray. "
                "Please upload a standard frontal chest X-ray for analysis."
            ),
            "view": view_result,
            "pneumonia": None,
            "fracture": None,
            "report": None,
            "report_en": None,
            "report_hi": None,
            "report_provider": None,
            "pipeline_timings": timings,
        }

    # ── Step 2: Pneumonia detection ──────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        pneumonia_result = _get_pneumonia_detector().predict(image_bytes)
    except Exception as e:
        logger.error(f"Pneumonia detector crashed: {e}")
        pneumonia_result = {
            "detected": False,
            "confidence": 0.0,
            "label": "Model Unavailable",
            "all_findings": [],
            "details": f"Pneumonia detector error: {e}",
            "model_used": "None",
            "simulation": False,
            "error": str(e),
        }
    timings["pneumonia_ms"] = round((time.perf_counter() - t0) * 1000, 1)

    # ── Step 3: Fracture detection ───────────────────────────────────────────
    t0 = time.perf_counter()
    try:
        fracture_result = _get_fracture_detector().predict(image_bytes)
    except Exception as e:
        logger.error(f"Fracture detector crashed: {e}")
        fracture_result = {
            "detected": False,
            "confidence": 0.0,
            "description": f"Fracture detector error: {e}",
            "locations": [],
            "model_used": "None",
            "simulation": False,
            "error": str(e),
        }
    timings["fracture_ms"] = round((time.perf_counter() - t0) * 1000, 1)

    # ── Step 4: Bilingual report synthesis ───────────────────────────────────
    t0 = time.perf_counter()
    try:
        from services.xray_report_synthesizer import synthesize_report
        synth = synthesize_report(view_result, pneumonia_result, fracture_result)
    except Exception as e:
        logger.error(f"Report synthesizer crashed: {e}")
        synth = {
            "report": f"Report generation failed: {e}",
            "provider": "Error",
            "en_section": f"Report generation failed: {e}",
            "hi_section": "रिपोर्ट जनरेशन विफल हुई।",
        }
    timings["synthesis_ms"] = round((time.perf_counter() - t0) * 1000, 1)
    timings["total_ms"] = sum(timings.values())

    # ── Aggregate risk ───────────────────────────────────────────────────────
    risk_level = "low"
    if pneumonia_result.get("detected") and fracture_result.get("detected"):
        risk_level = "critical"
    elif pneumonia_result.get("detected") or fracture_result.get("detected"):
        risk_level = "high"

    return {
        "success": True,
        "error_message": None,
        "view": view_result,
        "pneumonia": pneumonia_result,
        "fracture": fracture_result,
        "report": synth["report"],
        "report_en": synth["en_section"],
        "report_hi": synth["hi_section"],
        "report_provider": synth["provider"],
        "risk_level": risk_level,
        "pipeline_timings": timings,
    }
