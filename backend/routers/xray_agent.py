"""HealthMitra Scan – X-Ray Agent Router
Endpoints:
  POST /api/xray-agent/analyze   → full sequential pipeline
  GET  /api/xray-agent/status    → model availability status
"""
import os
import logging
import asyncio
from concurrent.futures import ThreadPoolExecutor

from fastapi import APIRouter, UploadFile, File, HTTPException, Query

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/xray-agent", tags=["X-Ray Sequential Agent"])

# Thread pool for blocking AI inference calls
_pool = ThreadPoolExecutor(max_workers=2, thread_name_prefix="xray-pool")

_ALLOWED_CONTENT_TYPES = {
    "image/jpeg", "image/jpg", "image/png",
    "image/webp", "image/tiff", "image/bmp",
}
_MAX_FILE_SIZE_MB = 20


@router.post("/analyze")
async def analyze_xray(
    file: UploadFile = File(..., description="Frontal chest X-ray (JPEG/PNG/WEBP, max 20 MB)"),
):
    """
    Sequential AI pipeline for chest X-ray analysis.

    Stages (in order):
      1. View Validation  – confirms AP/PA frontal view
      2. Pneumonia Detection – YOLOv8m chest X-ray classifier
      3. Fracture Detection  – ChexFract / YOLOv8 / ResNet fallback
      4. Bilingual Report    – GPT-4o / Claude / Ollama / static template

    Returns the aggregated result with per-stage details and timing.
    """
    # ── Validate file type ────────────────────────────────────────────────────
    if file.content_type not in _ALLOWED_CONTENT_TYPES:
        raise HTTPException(
            status_code=415,
            detail=(
                f"Unsupported file type '{file.content_type}'. "
                f"Please upload a JPEG, PNG, or WEBP image."
            ),
        )

    # ── Read & size-check ─────────────────────────────────────────────────────
    image_bytes = await file.read()
    size_mb = len(image_bytes) / (1024 * 1024)
    if size_mb > _MAX_FILE_SIZE_MB:
        raise HTTPException(
            status_code=413,
            detail=f"File too large ({size_mb:.1f} MB). Maximum allowed size is {_MAX_FILE_SIZE_MB} MB.",
        )

    if len(image_bytes) < 1024:
        raise HTTPException(status_code=400, detail="Uploaded file appears empty or corrupt.")

    # ── Run pipeline in thread pool (blocking AI calls) ───────────────────────
    loop = asyncio.get_event_loop()
    try:
        from agents.xray_sequential_agent import run_xray_agent
        result = await loop.run_in_executor(_pool, run_xray_agent, image_bytes)
    except Exception as e:
        logger.error(f"X-ray agent pipeline error: {e}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"X-ray analysis pipeline failed: {str(e)}",
        )

    # ── Return 422 with details if view validation failed ────────────────────
    if not result.get("success"):
        raise HTTPException(
            status_code=422,
            detail={
                "message": result.get("error_message", "Analysis failed."),
                "view": result.get("view"),
            },
        )

    return result


@router.get("/status")
def get_xray_agent_status():
    """
    Returns current model availability status for the X-ray agent.
    Does NOT load models – only checks for file presence.
    """
    import os

    backend_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    models_dir  = os.path.join(backend_dir, "models")

    pneumonia_model = os.path.join(models_dir, "yolov8-chest-xray", "best.pt")
    chexfract_dir   = os.path.join(models_dir, "chexfract-maira2")
    chexfract_config = os.path.join(chexfract_dir, "config.json")
    chexfract_index = os.path.join(chexfract_dir, "model.safetensors.index.json")
    yolo_frac_model = os.path.join(models_dir, "yolov8-fracture", "best.pt")

    # Check optional API keys
    has_openai    = bool(os.getenv("OPENAI_API_KEY", "").strip())
    has_anthropic = bool(os.getenv("ANTHROPIC_API_KEY", "").strip())
    has_together  = bool(os.getenv("TOGETHER_API_KEY", "").strip())

    # Check library availability without importing heavy modules or writing
    # package settings during a lightweight status request.
    from importlib.util import find_spec
    yolo_lib = find_spec("ultralytics") is not None
    torch_lib = find_spec("torch") is not None
    txrv_lib = find_spec("torchxrayvision") is not None

    pneumonia_status = "ready" if (yolo_lib and os.path.exists(pneumonia_model)) else (
        "model_missing" if yolo_lib else "library_missing"
    )
    chexfract_present = os.path.exists(chexfract_config) and os.path.exists(chexfract_index)
    chexfract_status = "ready" if (torch_lib and chexfract_present) else (
        "model_missing" if torch_lib else "library_missing"
    )
    yolo_frac_status = "ready" if (yolo_lib and os.path.exists(yolo_frac_model)) else (
        "model_missing" if yolo_lib else "library_missing"
    )

    llm_provider = (
        "OpenAI GPT-4o" if has_openai else
        "Anthropic Claude" if has_anthropic else
        "Together Llama" if has_together else
        "Ollama (local) / Static Template"
    )

    return {
        "pipeline": "X-Ray Sequential AI Agent",
        "stages": {
            "view_validation": {
                "status": "ready" if (torch_lib or True) else "library_missing",
                "method": "torchxrayvision DenseNet" if txrv_lib else "Rule-based (aspect ratio + brightness)",
                "torchxrayvision_available": txrv_lib,
            },
            "pneumonia_detection": {
                "status": pneumonia_status,
                "model_path": pneumonia_model,
                "model_present": os.path.exists(pneumonia_model),
                "ultralytics_available": yolo_lib,
                "download_cmd": (
                    "huggingface-cli download keremberke/yolov8m-chest-xray-classification "
                    "--local-dir backend/models/yolov8-chest-xray"
                ),
            },
            "fracture_detection": {
                "chexfract_status": chexfract_status,
                "chexfract_present": chexfract_present,
                "yolo_fracture_status": yolo_frac_status,
                "yolo_fracture_present": os.path.exists(yolo_frac_model),
                "torch_available": torch_lib,
                "clone_cmd": (
                    "git lfs install && git clone "
                    "https://huggingface.co/AIRI-Institute/chexfract-maira2 "
                    "backend/models/chexfract-maira2"
                ),
            },
            "report_synthesis": {
                "llm_provider": llm_provider,
                "openai_key_set": has_openai,
                "anthropic_key_set": has_anthropic,
                "together_key_set": has_together,
                "offline_fallback": "Static bilingual template (always available)",
            },
        },
    }
