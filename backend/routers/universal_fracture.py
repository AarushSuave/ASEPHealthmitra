"""FastAPI router for universal full-body fracture detection."""

from __future__ import annotations

from typing import List

from fastapi import APIRouter, File, HTTPException, UploadFile
from fastapi.responses import JSONResponse

from services.fracture_localizer import get_localizer
from services.universal_fracture_detector import ModelNotReadyError, get_detector
from utils.hardware_detector import HardwareDetector

router = APIRouter(prefix="/api/fracture", tags=["Universal Fracture Detection"])


def _detector():
    return get_detector()


def _localizer():
    return get_localizer()


@router.get("/health")
async def health_check():
    detector = _detector()
    localizer = _localizer()
    detector_status = detector.get_status()
    return {
        "status": "ready" if detector_status["model_present"] else "model_missing",
        "detector": detector_status,
        "localizer": localizer.get_status(),
        "hardware": detector_status["hardware"],
        "supported_fractures": detector.get_supported_fracture_types(),
    }


@router.get("/hardware")
async def get_hardware_info(deep: bool = False):
    return HardwareDetector.detect_all(deep=deep)


@router.get("/supported-types")
async def get_supported_fracture_types():
    detector = _detector()
    return {"fracture_types": detector.get_supported_fracture_types(), "count": len(detector.FRACTURE_TYPES)}


@router.post("/detect")
async def detect_fracture(
    file: UploadFile = File(...),
    include_localization: bool = False,
    return_all_probabilities: bool = False,
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Expected image, got {file.content_type}")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    try:
        result = _detector().predict(image_bytes)
    except ModelNotReadyError as exc:
        raise HTTPException(status_code=503, detail=str(exc)) from exc
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Fracture detection failed: {exc}") from exc

    if include_localization and result["detected"]:
        boxes = _localizer().detect(image_bytes)
        result["localizations"] = boxes
        result["has_localizations"] = bool(boxes)
    else:
        result["localizations"] = []
        result["has_localizations"] = False

    if not return_all_probabilities:
        result.pop("all_probabilities", None)

    if result["detected"]:
        result["message_en"] = f"FRACTURE DETECTED: {result['fracture_type'].replace('_', ' ').upper()}"
        result["message_hi"] = f"फ्रैक्चर का पता चला: {result['fracture_type_hi']}"
    else:
        result["message_en"] = "No fracture detected"
        result["message_hi"] = "कोई फ्रैक्चर नहीं पाया गया"

    result["confidence_percent"] = f"{result['confidence'] * 100:.1f}%"
    result["severity_en"] = result["severity"].upper()
    result["status"] = "success"
    result["file_info"] = {
        "filename": file.filename,
        "content_type": file.content_type,
        "size_bytes": len(image_bytes),
    }
    return JSONResponse(content=result)


@router.post("/batch-detect")
async def batch_detect_fractures(files: List[UploadFile] = File(...)):
    if len(files) > 10:
        raise HTTPException(status_code=400, detail="Maximum 10 images per batch request.")

    results = []
    for file in files:
        try:
            image_bytes = await file.read()
            result = _detector().predict(image_bytes)
            result["filename"] = file.filename
            result["status"] = "success"
        except Exception as exc:
            result = {"filename": file.filename, "status": "error", "error": str(exc)}
        results.append(result)

    return {
        "total": len(files),
        "successful": sum(1 for item in results if item["status"] == "success"),
        "failed": sum(1 for item in results if item["status"] == "error"),
        "results": results,
    }
