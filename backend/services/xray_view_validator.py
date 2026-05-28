"""HealthMitra Scan – X-Ray View Validator Service
Validates that an uploaded image is a frontal (AP/PA) chest X-ray.
Primary: rule-based aspect ratio + brightness heuristics.
Secondary: torchxrayvision DenseNet (if available).
"""
import io
import logging
import numpy as np
from PIL import Image

logger = logging.getLogger(__name__)

# Try to import torchxrayvision for an accurate view classifier
try:
    import torch
    import torchxrayvision as xrv
    import torchvision.transforms as transforms
    TORCHXRV_AVAILABLE = True
    logger.info("torchxrayvision available – using DenseNet view classifier.")
except ImportError:
    TORCHXRV_AVAILABLE = False
    logger.warning("torchxrayvision not installed. Using rule-based fallback validator.")


class XRayViewValidator:
    """
    Validates whether an image is a frontal (AP/PA) chest X-ray.
    Pipeline:
      1. Basic sanity checks (size, greyscale-ness)
      2. Aspect ratio heuristic
      3. Brightness / contrast profile typical of X-rays
      4. (Optional) torchxrayvision pathology model presence check
    """

    # Frontal CXR aspect ratios relaxed range
    _AR_MIN = 0.55
    _AR_MAX = 1.75

    def __init__(self):
        self._xrv_model = None
        if TORCHXRV_AVAILABLE:
            try:
                # Use a more general weights set for robustness
                self._xrv_model = xrv.models.DenseNet(weights="densenet121-res224-all")
                self._xrv_model.eval()
                logger.info("torchxrayvision DenseNet loaded.")
            except Exception as e:
                logger.warning(f"Could not load torchxrayvision model: {e}")
                self._xrv_model = None

    # ------------------------------------------------------------------
    # Internal helpers
    # ------------------------------------------------------------------

    def _load_image(self, image_bytes: bytes) -> Image.Image:
        return Image.open(io.BytesIO(image_bytes)).convert("RGB")

    def _aspect_ratio_check(self, img: Image.Image) -> tuple[bool, float]:
        w, h = img.size
        ar = w / h
        ok = self._AR_MIN <= ar <= self._AR_MAX
        return ok, round(ar, 3)

    def _greyscale_check(self, img: Image.Image) -> bool:
        """True if the image is predominantly greyscale (R≈G≈B), as X-rays are."""
        arr = np.array(img)
        rg_diff = np.abs(arr[:, :, 0].astype(int) - arr[:, :, 1].astype(int)).mean()
        rb_diff = np.abs(arr[:, :, 0].astype(int) - arr[:, :, 2].astype(int)).mean()
        return bool(float(rg_diff + rb_diff) < 20.0)  # relaxed threshold

    def _xrv_confidence(self, img: Image.Image) -> float | None:
        """
        Use the torchxrayvision model to infer whether this looks like a CXR.
        Returns a pseudo-confidence [0-1] based on how many pathology logits fire.
        """
        if self._xrv_model is None:
            return None
        try:
            import torch
            grey = img.convert("L")
            # Normalize to [-1024, 1024] as expected by torchxrayvision
            arr = np.array(grey).astype(np.float32)
            arr = (arr / 255.0) * 2048.0 - 1024.0
            arr = np.expand_dims(arr, axis=0)         # (1, H, W)
            arr = np.expand_dims(arr, axis=0)         # (1, 1, H, W)

            # Resize to 224×224 as expected by model
            from torchvision.transforms import Resize, InterpolationMode
            resizer = Resize((224, 224), interpolation=InterpolationMode.BILINEAR)
            tensor = torch.from_numpy(arr)
            tensor = resizer(tensor)

            with torch.no_grad():
                preds = self._xrv_model(tensor)        # (1, 18) – pathology logits
            # If multiple pathologies fire at moderate probability → likely a CXR
            activated = (torch.sigmoid(preds) > 0.05).sum().item()
            return min(1.0, activated / 5.0)           # ≥5 signals → full confidence
        except Exception as e:
            logger.warning(f"torchxrayvision inference failed: {e}")
            return None

    # ------------------------------------------------------------------
    # Public API
    # ------------------------------------------------------------------

    def validate(self, image_bytes: bytes) -> dict:
        """
        Returns:
            {
              "valid": bool,
              "view": str,
              "confidence": float,
              "aspect_ratio": float,
              "is_greyscale": bool,
              "message": str,
              "warnings": list[str]
            }
        """
        warnings = []

        try:
            img = self._load_image(image_bytes)
        except Exception as e:
            return {
                "valid": False,
                "view": "Unknown",
                "confidence": 0.0,
                "aspect_ratio": 0.0,
                "is_greyscale": False,
                "message": f"Could not read image: {e}",
                "warnings": ["Image file appears corrupt or unsupported."]
            }

        ar_ok, ar_val = self._aspect_ratio_check(img)
        is_grey = self._greyscale_check(img)
        
        # Relaxed brightness check: 10 to 240
        grey = np.array(img.convert("L"))
        mean_brightness = float(grey.mean())
        brightness_ok = 10 < mean_brightness < 240

        if not ar_ok:
            warnings.append(f"Aspect ratio {ar_val} is outside typical range.")
        if not is_grey:
            warnings.append("Image has color channels.")
        if not brightness_ok:
            warnings.append(f"Unusual brightness ({mean_brightness:.1f}).")

        # torchxrayvision boost
        xrv_conf = self._xrv_confidence(img)
        base_confidence = 0.70 if (ar_ok and is_grey) else 0.40
        
        confidence = base_confidence
        if xrv_conf is not None:
            confidence = 0.4 * base_confidence + 0.6 * xrv_conf

        # FINAL LOGIC: Valid if heuristics pass OR if AI model is very confident
        is_valid = (ar_ok and brightness_ok)
        if xrv_conf and xrv_conf > 0.35:
            is_valid = True
            logger.info(f"View validation: AI model override (conf={xrv_conf:.2f})")

        view_label = "AP/PA (Frontal)" if is_valid else (
            "Likely Lateral" if not ar_ok else "Invalid View"
        )

        message = (
            "Frontal chest X-ray detected and validated."
            if is_valid and len(warnings) == 0
            else ("View validation passed with warnings." if is_valid else "Image does not appear to be a frontal chest X-ray.")
        )

        return {
            "valid": bool(is_valid),
            "view": view_label,
            "confidence": float(round(confidence, 3)),
            "aspect_ratio": float(ar_val),
            "is_greyscale": bool(is_grey),
            "message": message,
            "warnings": warnings
        }
