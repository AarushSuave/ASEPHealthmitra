"""HealthMitra Scan – Pneumonia Detector Service
Uses keremberke/yolov8m-chest-xray-classification (Hugging Face) if available,
falls back to a simulated rule-based response for demo when the model is absent.
"""
import io
import os
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# If enabled, we will not silently fall back to simulation when the real model
# can't be loaded. This prevents users from getting inaccurate predictions.
REQUIRE_REAL_MODELS = os.getenv("HEALTHMITRA_REQUIRE_REAL_MODELS", "1") == "1"

# Resolve model path relative to this file's location (backend/services/)
_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_DEFAULT_MODEL_PATH = os.path.join(_BACKEND_DIR, "models", "yolov8-chest-xray", "best.pt")

# Try YOLO
try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False
    logger.warning("ultralytics not installed. PneumoniaDetector will use simulation mode.")


# Map class names as defined in the keremberke model
_CLASS_NAMES = {
    0: "Normal",
    1: "Pneumonia",
}
_PNEUMONIA_CLASS_IDS = {1}  # class id 1 → Pneumonia in this model


class PneumoniaDetector:
    """
    Runs YOLOv8 classification/detection for pneumonia on a chest X-ray.

    Model priority:
      1. Local fine-tuned model at  backend/models/yolov8-chest-xray/best.pt
      2. Simulation fallback (returns neutral result with explanation).
    """

    def __init__(self, model_path: str = _DEFAULT_MODEL_PATH):
        self._model = None
        self._simulation = True

        if YOLO_AVAILABLE:
            if os.path.exists(model_path):
                try:
                    self._model = YOLO(model_path)
                    self._simulation = False
                    logger.info(f"PneumoniaDetector: loaded model from {model_path}")
                except Exception as e:
                    logger.error(f"PneumoniaDetector: failed to load model: {e}")
                    if REQUIRE_REAL_MODELS:
                        raise RuntimeError(
                            f"Pneumonia model failed to load from {model_path}. "
                            f"Underlying error: {e}"
                        ) from e
            else:
                msg = (
                    f"Pneumonia model weights are missing at: {model_path}. "
                    "Run `run.bat --download-models` to fetch the full models."
                )
                if REQUIRE_REAL_MODELS:
                    raise RuntimeError(msg)
                logger.warning(msg + " Running in simulation mode.")
        else:
            msg = "PneumoniaDetector: ultralytics is not installed. Install dependencies and use full models."
            if REQUIRE_REAL_MODELS:
                raise RuntimeError(msg)
            logger.warning("PneumoniaDetector: ultralytics unavailable – simulation mode.")

    # ------------------------------------------------------------------
    def predict(self, image_bytes: bytes) -> dict:
        """
        Returns:
            {
              "detected": bool,
              "confidence": float,
              "label": str,
              "all_findings": list[dict],
              "details": str,
              "simulation": bool
            }
        """
        if self._simulation:
            return self._simulate(image_bytes)
        return self._run_model(image_bytes)

    # ------------------------------------------------------------------
    def _run_model(self, image_bytes: bytes) -> dict:
        img = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = self._model(img, verbose=False)

        all_findings = []
        pneumonia_detected = False
        pneumonia_conf = 0.0

        result = results[0]

        # ── Classification model path (probs) ──
        if hasattr(result, "probs") and result.probs is not None:
            probs = result.probs
            # Get specific probability for Pneumonia (class 1)
            # result.probs.data contains the tensor of probabilities
            p_conf = float(probs.data[1]) 
            pneumonia_detected = p_conf > 0.45
            pneumonia_conf = p_conf
            
            top_id = int(probs.top1)
            top_label = _CLASS_NAMES.get(top_id, f"Class-{top_id}")
            
            for i, name in _CLASS_NAMES.items():
                all_findings.append({
                    "label": name, 
                    "confidence": float(round(float(probs.data[i]), 4))
                })

        # ── Detection model path (boxes) ──
        elif hasattr(result, "boxes") and result.boxes is not None:
            for box in result.boxes:
                cls_id = int(box.cls[0])
                conf = float(box.conf[0])
                label = _CLASS_NAMES.get(cls_id, f"Class-{cls_id}")
                all_findings.append({"label": label, "confidence": round(conf, 4)})
                if cls_id in _PNEUMONIA_CLASS_IDS and conf > pneumonia_conf:
                    pneumonia_detected = True
                    pneumonia_conf = conf

        label_str = "Pneumonia" if pneumonia_detected else "No Pneumonia"
        details = (
            f"Pneumonia detected with {pneumonia_conf*100:.1f}% confidence."
            if pneumonia_detected
            else "No pneumonia signs detected in this X-ray."
        )

        return {
            "detected": pneumonia_detected,
            "confidence": round(pneumonia_conf, 4),
            "label": label_str,
            "all_findings": all_findings,
            "details": details,
            "simulation": False
        }

    # ------------------------------------------------------------------
    def _simulate(self, image_bytes: bytes) -> dict:
        """
        Deterministic simulation based on image statistics.
        In a real deployment this path is never hit.
        """
        import numpy as np
        arr = np.array(Image.open(io.BytesIO(image_bytes)).convert("L"))
        # Use pixel-mean as a pseudo-signal (not clinically meaningful)
        mean_val = arr.mean()
        detected = bool(mean_val < 90)          # darker images → simulate positive
        conf = float(round(abs(mean_val - 128) / 128, 3))
        details = (
            f"[SIMULATION] Pneumonia indicator triggered (image mean={mean_val:.1f})."
            if detected
            else f"[SIMULATION] No pneumonia indicator (image mean={mean_val:.1f})."
        )
        return {
            "detected": detected,
            "confidence": conf,
            "label": "Pneumonia (simulated)" if detected else "Normal (simulated)",
            "all_findings": [{"label": "Simulation mode", "confidence": conf}],
            "details": details,
            "simulation": True
        }
