"""Universal full-body fracture detector.

The service is hardware agnostic and supports TensorFlow .h5/.keras models or
ONNX fallback weights. It intentionally does not create an untrained model for
diagnosis; trained weights must be installed under backend/models first.
"""

from __future__ import annotations

import io
import os
import time
from pathlib import Path
from typing import Any, Dict, List, Optional

import numpy as np
from PIL import Image

from utils.hardware_detector import HardwareDetector


class ModelNotReadyError(RuntimeError):
    """Raised when no trained fracture model is installed."""


class UniversalFractureDetector:
    """Full-body fracture classifier with lazy model loading."""

    FRACTURE_TYPES = [
        "comminuted",
        "greenstick",
        "linear",
        "oblique",
        "oblique_displaced",
        "segmental",
        "spiral",
        "transverse",
        "transverse_displaced",
        "healthy",
    ]

    SEVERITY_MAP = {
        "comminuted": "critical",
        "segmental": "critical",
        "transverse_displaced": "severe",
        "oblique_displaced": "severe",
        "spiral": "moderate",
        "oblique": "moderate",
        "transverse": "mild",
        "linear": "mild",
        "greenstick": "mild",
        "healthy": "none",
    }

    FRACTURE_TYPES_HI = {
        "comminuted": "बहुखंडित फ्रैक्चर",
        "greenstick": "ग्रीनस्टिक फ्रैक्चर",
        "linear": "रैखिक फ्रैक्चर",
        "oblique": "तिरछा फ्रैक्चर",
        "oblique_displaced": "विस्थापित तिरछा फ्रैक्चर",
        "segmental": "खंडीय फ्रैक्चर",
        "spiral": "सर्पिल फ्रैक्चर",
        "transverse": "अनुप्रस्थ फ्रैक्चर",
        "transverse_displaced": "विस्थापित अनुप्रस्थ फ्रैक्चर",
        "healthy": "स्वस्थ",
    }

    def __init__(self, model_path: Optional[str] = None):
        backend_dir = Path(__file__).resolve().parent.parent
        self.models_dir = backend_dir / "models"
        self.model_path = Path(model_path) if model_path else self.models_dir / "fracture_model.h5"
        self.keras_alt_path = self.models_dir / "fracture_model.keras"
        self.onnx_path = self.models_dir / "fracture_model.onnx"
        self.class_names_path = self.models_dir / "fracture_classes.json"
        self.model = None
        self.backend = "not_loaded"
        self.is_loaded = False
        self.load_time_ms = 0.0
        self.hardware_detector = HardwareDetector()
        self.device_info = self.hardware_detector.detect_all(deep=False)

    def get_status(self) -> Dict[str, Any]:
        installed_path = self._installed_model_path()
        return {
            "loaded": self.is_loaded,
            "backend": self.backend,
            "model_present": installed_path is not None,
            "model_path": str(installed_path) if installed_path else None,
            "expected_paths": [str(self.model_path), str(self.keras_alt_path), str(self.onnx_path)],
            "load_time_ms": self.load_time_ms,
            "hardware": self.hardware_detector.detect_all(deep=False),
            "requires_trained_weights": installed_path is None,
        }

    def _installed_model_path(self) -> Optional[Path]:
        for path in (self.model_path, self.keras_alt_path, self.onnx_path):
            if path.exists() and path.stat().st_size > 1024:
                return path
        return None

    def _load_model(self) -> None:
        if self.is_loaded:
            return

        installed_path = self._installed_model_path()
        if installed_path is None:
            raise ModelNotReadyError(
                "No trained universal fracture model is installed. Place fracture_model.h5, "
                "fracture_model.keras, or fracture_model.onnx in backend/models and rerun setup."
            )

        start = time.perf_counter()
        if installed_path.suffix.lower() == ".onnx":
            self._load_onnx(installed_path)
        else:
            self._load_tensorflow(installed_path)
        self.is_loaded = True
        self.load_time_ms = round((time.perf_counter() - start) * 1000, 1)
        self.device_info = self.hardware_detector.detect_all(deep=True)

    def _load_tensorflow(self, path: Path) -> None:
        try:
            import tensorflow as tf
        except Exception as exc:
            if self.onnx_path.exists():
                self._load_onnx(self.onnx_path)
                return
            raise ModelNotReadyError(f"TensorFlow is unavailable and no ONNX fallback exists: {exc}") from exc

        self.model = tf.keras.models.load_model(path)
        self.backend = "tensorflow"

    def _load_onnx(self, path: Path) -> None:
        try:
            import onnxruntime as ort
        except Exception as exc:
            raise ModelNotReadyError(f"ONNX Runtime is unavailable: {exc}") from exc

        providers = ort.get_available_providers()
        self.model = ort.InferenceSession(str(path), providers=providers)
        self.backend = "onnxruntime"

    def preprocess_image(self, image_bytes: bytes) -> np.ndarray:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        image = image.resize((224, 224), Image.Resampling.LANCZOS)
        return np.expand_dims(np.asarray(image, dtype=np.float32) / 255.0, axis=0)

    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        self._load_model()
        start = time.perf_counter()
        processed = self.preprocess_image(image_bytes)

        if self.backend == "tensorflow":
            predictions = self.model.predict(processed, verbose=0)
        elif self.backend == "onnxruntime":
            input_name = self.model.get_inputs()[0].name
            output_name = self.model.get_outputs()[0].name
            predictions = self.model.run([output_name], {input_name: processed})[0]
        else:
            raise RuntimeError("Fracture detector backend is not loaded.")

        inference_time_ms = round((time.perf_counter() - start) * 1000, 1)
        probabilities = np.asarray(predictions[0], dtype=np.float32)
        probabilities = self._normalize_probabilities(probabilities)

        predicted_idx = int(np.argmax(probabilities))
        confidence = float(probabilities[predicted_idx])
        fracture_type = self.FRACTURE_TYPES[predicted_idx]
        severity = self.SEVERITY_MAP[fracture_type]

        return {
            "detected": fracture_type != "healthy",
            "fracture_type": fracture_type,
            "fracture_type_hi": self.FRACTURE_TYPES_HI[fracture_type],
            "confidence": confidence,
            "severity": severity,
            "inference_time_ms": inference_time_ms,
            "hardware_info": self.device_info,
            "backend": self.backend,
            "recommendation": self._get_recommendation(severity),
            "all_probabilities": {
                self.FRACTURE_TYPES[index]: float(probabilities[index])
                for index in range(len(self.FRACTURE_TYPES))
            },
        }

    def _normalize_probabilities(self, values: np.ndarray) -> np.ndarray:
        values = values.reshape(-1)
        if values.size != len(self.FRACTURE_TYPES):
            raise RuntimeError(
                f"Model returned {values.size} outputs; expected {len(self.FRACTURE_TYPES)} fracture classes."
            )
        if np.any(values < 0) or not np.isclose(values.sum(), 1.0, atol=1e-3):
            exp = np.exp(values - np.max(values))
            return exp / exp.sum()
        return values

    def _get_recommendation(self, severity: str) -> Dict[str, str]:
        recommendations = {
            "critical": {
                "en": "URGENT: Seek immediate emergency medical attention. Do not move or bear weight on the affected area.",
                "hi": "तत्काल: तुरंत आपातकालीन चिकित्सा सहायता लें। प्रभावित हिस्से को न हिलाएं और उस पर वजन न डालें।",
            },
            "severe": {
                "en": "SEEK MEDICAL CARE: Visit an emergency department or orthopedic clinician within 24 hours.",
                "hi": "चिकित्सा सहायता लें: 24 घंटों के भीतर आपातकालीन विभाग या हड्डी रोग विशेषज्ञ से मिलें।",
            },
            "moderate": {
                "en": "CONSULT DOCTOR: Immobilize the area and arrange clinical review within 48-72 hours.",
                "hi": "डॉक्टर से सलाह लें: प्रभावित हिस्से को स्थिर रखें और 48-72 घंटों में जांच कराएं।",
            },
            "mild": {
                "en": "MONITOR: Rest, ice, compression, and elevation may help. See a doctor if pain persists or function is reduced.",
                "hi": "निगरानी करें: आराम, बर्फ, दबाव और ऊंचाई मदद कर सकते हैं। दर्द बना रहे तो डॉक्टर से मिलें।",
            },
            "none": {
                "en": "No fracture pattern was detected by the installed model. If pain persists, consult a clinician.",
                "hi": "इंस्टॉल किए गए मॉडल ने फ्रैक्चर पैटर्न नहीं पाया। दर्द बना रहे तो डॉक्टर से सलाह लें।",
            },
        }
        return recommendations.get(severity, recommendations["none"])

    def get_supported_fracture_types(self) -> List[Dict[str, str]]:
        return [
            {"code": code, "name_en": code.replace("_", " ").title(), "name_hi": self.FRACTURE_TYPES_HI[code]}
            for code in self.FRACTURE_TYPES
        ]


_detector_instance: Optional[UniversalFractureDetector] = None


def get_detector() -> UniversalFractureDetector:
    global _detector_instance
    if _detector_instance is None:
        _detector_instance = UniversalFractureDetector()
    return _detector_instance
