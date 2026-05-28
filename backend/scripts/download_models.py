"""Prepare model folders for universal fracture detection."""

from __future__ import annotations

import json
import sys
from pathlib import Path

sys.path.append(str(Path(__file__).resolve().parent.parent))

from services.universal_fracture_detector import UniversalFractureDetector
from utils.hardware_detector import HardwareDetector


def main() -> int:
    backend_dir = Path(__file__).resolve().parent.parent
    models_dir = backend_dir / "models"
    sample_dir = backend_dir / "data" / "sample_xrays"
    models_dir.mkdir(exist_ok=True)
    sample_dir.mkdir(parents=True, exist_ok=True)

    detector = UniversalFractureDetector()
    classes = detector.get_supported_fracture_types()
    (models_dir / "fracture_classes.json").write_text(
        json.dumps(classes, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print("=" * 60)
    print("Universal Fracture Detection Setup")
    print("=" * 60)
    hw = HardwareDetector.detect_all(deep=False)
    print(f"Platform: {hw['platform']} {hw['platform_release']}")
    print(f"Installed backends: {hw['installed_backends']}")
    print()
    print("Model folders are ready.")
    print(f"Models directory: {models_dir}")
    print(f"Sample X-ray directory: {sample_dir}")
    print()
    print("Required trained classifier weights:")
    print(f"  {models_dir / 'fracture_model.h5'}")
    print(f"  {models_dir / 'fracture_model.keras'}")
    print(f"  {models_dir / 'fracture_model.onnx'}")
    print()
    print("Optional localization weights:")
    print(f"  {models_dir / 'yolov8_fracture.pt'}")
    print()
    print("No placeholder diagnostic model was created. Install trained weights before clinical-style testing.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
