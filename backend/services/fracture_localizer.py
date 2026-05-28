"""Optional YOLOv8 fracture localization."""

from __future__ import annotations

import io
from pathlib import Path
from typing import Any, Dict, List, Optional

from PIL import Image


class FractureLocalizer:
    """YOLOv8-based optional bounding box localizer."""

    def __init__(self, model_path: Optional[str] = None):
        backend_dir = Path(__file__).resolve().parent.parent
        self.model_path = Path(model_path) if model_path else backend_dir / "models" / "yolov8_fracture.pt"
        self.model = None
        self.is_loaded = False
        self.unavailable_reason = None

    def get_status(self) -> Dict[str, Any]:
        return {
            "loaded": self.is_loaded,
            "model_present": self.model_path.exists() and self.model_path.stat().st_size > 1024,
            "model_path": str(self.model_path),
            "unavailable_reason": self.unavailable_reason,
        }

    def _load_model(self) -> bool:
        if self.is_loaded:
            return True
        if not self.model_path.exists() or self.model_path.stat().st_size <= 1024:
            self.unavailable_reason = "YOLO localization weights are not installed."
            return False

        try:
            from ultralytics import YOLO

            self.model = YOLO(str(self.model_path))
            self.is_loaded = True
            self.unavailable_reason = None
            return True
        except Exception as exc:
            self.unavailable_reason = str(exc)
            return False

    def detect(self, image_bytes: bytes, confidence_threshold: float = 0.5) -> List[Dict[str, Any]]:
        if not self._load_model() or self.model is None:
            return []

        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        results = self.model(image, verbose=False, conf=confidence_threshold)

        boxes: List[Dict[str, Any]] = []
        if results and results[0].boxes is not None:
            for box in results[0].boxes:
                boxes.append(
                    {
                        "bbox": [float(v) for v in box.xyxy[0].tolist()],
                        "confidence": float(box.conf[0]),
                        "class_id": int(box.cls[0]) if box.cls is not None else 0,
                    }
                )
        return boxes


_localizer_instance: Optional[FractureLocalizer] = None


def get_localizer() -> FractureLocalizer:
    global _localizer_instance
    if _localizer_instance is None:
        _localizer_instance = FractureLocalizer()
    return _localizer_instance
