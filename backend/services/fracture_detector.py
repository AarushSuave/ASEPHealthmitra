"""HealthMitra Scan – Fracture Detector Service
Primary: AIRI-Institute/chexfract-maira2 (causal LM, ~3.8B params)
Fallback 1: keremberke/yolov8m-fracture-detection (YOLO detection)
Fallback 2: microsoft/resnet-50 feature similarity (lightweight)
Fallback 3: pure simulation mode
"""
import io
import os
import logging
from PIL import Image

logger = logging.getLogger(__name__)

# If enabled, we will not silently return low-accuracy fallbacks or simulation
# when the real fracture models (ChexFract / YOLO) are missing.
REQUIRE_REAL_MODELS = os.getenv("HEALTHMITRA_REQUIRE_REAL_MODELS", "1") == "1"

_BACKEND_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
_CHEXFRACT_PATH   = os.path.join(_BACKEND_DIR, "models", "chexfract-maira2")
_YOLO_FRAC_PATH   = os.path.join(_BACKEND_DIR, "models", "yolov8-fracture", "best.pt")

_FRACTURE_KEYWORDS = [
    "fracture", "broken", "crack", "displacement",
    "displaced", "cortical break", "lucency", "rib fracture",
    "clavicle fracture", "scapula fracture", "vertebral"
]


# ── Try importing heavy dependencies ─────────────────────────────────────────
try:
    import torch
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False
    logger.warning("torch not installed. FractureDetector will use simulation mode.")

try:
    from ultralytics import YOLO
    YOLO_AVAILABLE = True
except ImportError:
    YOLO_AVAILABLE = False


class FractureDetector:
    """
    Sequential fracture detection with graceful degradation:
      1. ChexFract (MAIRA-2) generative model
      2. YOLOv8 fracture detection
      3. ResNet-50 lightweight classifier
      4. Simulation mode
    """

    def __init__(self):
        self._mode = "simulation"
        self._chexfract_processor = None
        self._chexfract_model = None
        self._chexfract_processor = None
        self._yolo_frac = None
        self._resnet_pipeline = None

        # Try order: 1. ChexFract -> 2. YOLOv8 -> 3. ResNet -> 4. Simulation
        if self._try_load_chexfract():
            return
        if self._try_load_yolo_fracture():
            return
        if self._try_load_resnet():
            if REQUIRE_REAL_MODELS:
                raise RuntimeError(
                    "Fracture full models are missing. ChexFract and YOLO weights were not found, "
                    "so the detector fell back to ResNet-50 (low accuracy). "
                    "Run `run.bat --download-models` to fetch the full models."
                )
            return
        
        if REQUIRE_REAL_MODELS:
            raise RuntimeError(
                "Fracture models are not available (ChexFract/YOLO failed to load). "
                "Run `run.bat --download-models` to fetch the full models."
            )
        logger.warning("All fracture models failed to load. Using simulation mode.")

    # ------------------------------------------------------------------
    # Loading helpers
    # ------------------------------------------------------------------

    def _try_load_chexfract(self) -> bool:
        if not TORCH_AVAILABLE:
            return False
        if not os.path.exists(_CHEXFRACT_PATH):
            return False
        
        try:
            from transformers import AutoModelForCausalLM, AutoProcessor
            self._chexfract_processor = AutoProcessor.from_pretrained(
                _CHEXFRACT_PATH, trust_remote_code=True
            )
            self._chexfract_model = AutoModelForCausalLM.from_pretrained(
                _CHEXFRACT_PATH,
                trust_remote_code=True,
                dtype=torch.float16 if torch.cuda.is_available() else torch.float32,
                device_map="auto" if torch.cuda.is_available() else None,
                low_cpu_mem_usage=True
            )
            self._chexfract_model.eval()
            self._mode = "chexfract"
            logger.info("ChexFract loaded successfully.")
            return True
        except Exception as e:
            logger.error(f"ChexFract load failed: {e}. Trying YOLOv8 fracture fallback.")
            return False

    def _try_load_yolo_fracture(self) -> bool:
        if not YOLO_AVAILABLE:
            return False
        if not os.path.exists(_YOLO_FRAC_PATH):
            logger.warning(f"YOLOv8 fracture model not found at {_YOLO_FRAC_PATH}")
            return False
        try:
            self._yolo_frac = YOLO(_YOLO_FRAC_PATH)
            self._mode = "yolo_fracture"
            logger.info("YOLOv8 fracture model loaded.")
            return True
        except Exception as e:
            logger.error(f"YOLOv8 fracture load failed: {e}. Trying ResNet fallback.")
            return False

    def _try_load_resnet(self) -> bool:
        if not TORCH_AVAILABLE:
            return False
        try:
            from transformers import pipeline
            self._resnet_pipeline = pipeline(
                "image-classification",
                model="microsoft/resnet-50",
                top_k=5
            )
            self._mode = "resnet"
            logger.info("ResNet-50 loaded as lightweight fracture fallback.")
            return True
        except Exception as e:
            logger.warning(f"ResNet-50 load failed: {e}. Using simulation mode.")
            self._mode = "simulation"
            return False

    # ------------------------------------------------------------------
    # Public predict
    # ------------------------------------------------------------------

    def predict(self, image_bytes: bytes) -> dict:
        """
        Returns:
            {
              "detected": bool,
              "confidence": float,
              "description": str,
              "locations": list[str],
              "model_used": str,
              "simulation": bool
            }
        """
        if self._mode == "chexfract":
            result = self._predict_chexfract(image_bytes)
            if result.get("simulation"):
                # If ChexFract inference failed at runtime, try lighter fallbacks
                if self._yolo_frac is None:
                    self._try_load_yolo_fracture()
                if self._yolo_frac is not None:
                    return self._predict_yolo_fracture(image_bytes)

                if self._resnet_pipeline is None:
                    self._try_load_resnet()
                if self._resnet_pipeline is not None:
                    return self._predict_resnet(image_bytes)
            return result
        elif self._mode == "yolo_fracture":
            result = self._predict_yolo_fracture(image_bytes)
            if result.get("simulation") and self._resnet_pipeline is not None:
                return self._predict_resnet(image_bytes)
            return result
        elif self._mode == "resnet":
            return self._predict_resnet(image_bytes)
        else:
            # As a last resort, try to lazily load YOLO fracture if weights are present
            if self._yolo_frac is None and self._try_load_yolo_fracture():
                return self._predict_yolo_fracture(image_bytes)
            return self._simulate(image_bytes)

    # ------------------------------------------------------------------
    # Prediction backends
    # ------------------------------------------------------------------

    def _predict_chexfract(self, image_bytes: bytes) -> dict:
        import torch
        # Auto-edit: Ensure image is optimal for ChexFract (RGB)
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        try:
            messages = [
                {"role": "user", "content": "<|image_1|>\nAnalyze this chest X-ray for any fractures, breaks, or structural abnormalities. Findings:"}
            ]
            # Use chat template if available, otherwise fallback to simple formatted string
            if hasattr(self._chexfract_processor, "tokenizer") and hasattr(self._chexfract_processor.tokenizer, "apply_chat_template"):
                prompt = self._chexfract_processor.tokenizer.apply_chat_template(messages, tokenize=False, add_generation_prompt=True)
            else:
                prompt = "<|user|>\n<|image_1|>\nAnalyze this chest X-ray for any fractures, breaks, or structural abnormalities. Findings:<|end|>\n<|assistant|>\n"

            inputs = self._chexfract_processor(images=image, text=prompt, return_tensors="pt")
            if torch.cuda.is_available():
                inputs = {k: v.cuda() for k, v in inputs.items()}
            with torch.no_grad():
                generated_ids = self._chexfract_model.generate(
                    **inputs,
                    max_new_tokens=300,
                    do_sample=False,
                    pad_token_id=self._chexfract_processor.tokenizer.eos_token_id
                    if hasattr(self._chexfract_processor, "tokenizer") else None,
                )
            description = self._chexfract_processor.batch_decode(
                generated_ids, skip_special_tokens=True
            )[0].strip()
            detected = any(kw in description.lower() for kw in _FRACTURE_KEYWORDS)
            locations = self._extract_locations(description)
            return {
                "detected": detected,
                "confidence": 0.92 if detected else 0.88,
                "description": description,
                "locations": locations,
                "model_used": "ChexFract (MAIRA-2)",
                "simulation": False
            }
        except Exception as e:
            logger.error(f"ChexFract inference error: {e}")
            # IMPORTANT: do not immediately mark as simulation if a real fallback exists
            return self._simulate(image_bytes, note=f"ChexFract inference failed: {e}")

    def _predict_yolo_fracture(self, image_bytes: bytes) -> dict:
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        try:
            results = self._yolo_frac(image, verbose=False)
            boxes = results[0].boxes
            detected = len(boxes) > 0
            locations = []
            conf = 0.0
            for box in boxes:
                conf = max(conf, float(box.conf[0]))
                locations.append(f"Region ({int(box.xyxy[0][0])},{int(box.xyxy[0][1])})")
            description = (
                f"YOLOv8 fracture detection found {len(boxes)} potential fracture region(s)."
                if detected else "No fracture regions detected by YOLOv8."
            )
            return {
                "detected": detected,
                "confidence": round(conf, 4),
                "description": description,
                "locations": locations,
                "model_used": "YOLOv8m-fracture-detection",
                "simulation": False
            }
        except Exception as e:
            logger.error(f"YOLOv8 fracture inference error: {e}")
            return self._simulate(image_bytes, note=f"YOLO inference failed: {e}")

    def _predict_resnet(self, image_bytes: bytes) -> dict:
        """ResNet-50 is a general classifier; we use it as a presence heuristic."""
        from transformers import pipeline as hf_pipeline  # local import
        image = Image.open(io.BytesIO(image_bytes)).convert("RGB")
        try:
            results = hf_pipeline(
                "image-classification",
                model="microsoft/resnet-50",
                top_k=5
            )(image)
            top_labels = [r["label"].lower() for r in results]
            # ResNet on ImageNet won't have 'fracture'; use low-confidence disclaimer
            description = (
                "ResNet-50 analysis completed. "
                "Note: This is a general-purpose model; fracture classification accuracy is limited. "
                f"Top visual features detected: {', '.join(top_labels[:3])}."
            )
            return {
                "detected": False,   # ResNet-50 cannot reliably detect fractures
                "confidence": 0.40,
                "description": description,
                "locations": [],
                "model_used": "ResNet-50 (lightweight fallback – low accuracy)",
                "simulation": False
            }
        except Exception as e:
            return self._simulate(image_bytes, note=f"ResNet failed: {e}")

    def _simulate(self, image_bytes: bytes, note: str = "") -> dict:
        """Pixel-statistics based simulation for demo / development."""
        import numpy as np
        arr = np.array(Image.open(io.BytesIO(image_bytes)).convert("L"))
        std_val = arr.std()
        detected = std_val > 65
        description = (
            "[SIMULATION] High image contrast suggests potential structural irregularity. "
            "A radiologist review is recommended."
            if detected
            else "[SIMULATION] No obvious structural irregularity detected in this X-ray."
        )
        if note:
            description += f" ({note})"
        return {
            "detected": bool(detected),
            "confidence": float(round(min(std_val / 100, 0.95), 3)),
            "description": description,
            "locations": [],
            "model_used": "Simulation",
            "simulation": True
        }

    # ------------------------------------------------------------------
    @staticmethod
    def _extract_locations(text: str) -> list:
        """Extract anatomical location mentions from generated text."""
        anatomy_keywords = [
            "rib", "clavicle", "scapula", "sternum", "vertebra",
            "humerus", "shoulder", "spine", "thoracic", "lumbar"
        ]
        found = []
        tl = text.lower()
        for kw in anatomy_keywords:
            if kw in tl:
                found.append(kw.capitalize())
        return list(set(found))
