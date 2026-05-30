"""FastAPI router for modular universal X-ray diagnostics."""
from __future__ import annotations
from fastapi import APIRouter, File, HTTPException, UploadFile, Form
from fastapi.responses import JSONResponse
from services.xray_models.registry import get_registry

router = APIRouter(prefix="/api/xray", tags=["Universal Modular X-Ray Diagnostics"])

@router.get("/models")
async def list_models():
    registry = get_registry()
    models = registry.list_models()
    return {
        "count": len(models),
        "models": [
            {
                "name": m.name,
                "display_name": m.display_name,
                "target_conditions": m.target_conditions,
                "description": m.description,
                "is_available": m.is_available(),
                "status": "ready" if m.is_available() else "fallback"
            }
            for m in models
        ]
    }

@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(...),
    model_name: str = Form("general_anomaly")
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Expected image, got {file.content_type}")

    registry = get_registry()
    model = registry.get_model(model_name)
    if not model:
        raise HTTPException(status_code=400, detail=f"Invalid model_name '{model_name}'.")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    try:
        result = model.predict(image_bytes)
        
        # If fracture model is used and detected, perform localization to support bounding box visualization
        if model_name == "fracture" and result.get("detected"):
            try:
                from services.fracture_localizer import get_localizer
                boxes = get_localizer().detect(image_bytes)
                result["localizations"] = boxes
                result["has_localizations"] = bool(boxes)
            except Exception as e:
                result["localizations"] = []
                result["has_localizations"] = False
        
        # Add basic file details
        result["file_info"] = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": len(image_bytes)
        }
        
        return JSONResponse(content=result)
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Modular analysis failed: {exc}")


@router.post("/analyze-comprehensive")
async def analyze_comprehensive(
    file: UploadFile = File(...)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Expected image, got {file.content_type}")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    try:
        from services.xray_models.comprehensive_analyzer import ComprehensiveXRayAnalyzer
        analyzer = ComprehensiveXRayAnalyzer()
        result = analyzer.analyze(image_bytes)
        
        result["file_info"] = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": len(image_bytes)
        }
        
        return JSONResponse(content=result)
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Comprehensive analysis failed: {exc}")


@router.post("/analyze-clinical")
async def analyze_clinical(
    file: UploadFile = File(...),
    accuracy_first: bool = Form(False)
):
    if not file.content_type or not file.content_type.startswith("image/"):
        raise HTTPException(status_code=400, detail=f"Invalid file type. Expected image, got {file.content_type}")

    image_bytes = await file.read()
    if not image_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")
    if len(image_bytes) > 20 * 1024 * 1024:
        raise HTTPException(status_code=400, detail="File too large. Maximum size is 20MB.")

    try:
        from services.xray_models.clinical_engine import ClinicalXRayEngine
        engine = ClinicalXRayEngine()
        result = engine.run_diagnostics(image_bytes, accuracy_first=accuracy_first)
        
        result["file_info"] = {
            "filename": file.filename,
            "content_type": file.content_type,
            "size_bytes": len(image_bytes)
        }
        
        return JSONResponse(content=result)
        
    except Exception as exc:
        raise HTTPException(status_code=500, detail=f"Clinical analysis pipeline failed: {exc}")
