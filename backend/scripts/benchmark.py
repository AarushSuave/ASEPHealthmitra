"""Benchmark universal fracture detection performance."""

from __future__ import annotations

import argparse
import json
import sys
import time
from pathlib import Path
from typing import Any, Dict

sys.path.append(str(Path(__file__).resolve().parent.parent))

from services.universal_fracture_detector import ModelNotReadyError, UniversalFractureDetector


def run_benchmark(dataset_path: str, num_images: int = 50, warmup: int = 5) -> Dict[str, Any]:
    detector = UniversalFractureDetector()
    image_paths = []
    root = Path(dataset_path)
    for pattern in ("*.jpg", "*.jpeg", "*.png", "*.bmp", "*.tiff", "*.JPG", "*.PNG"):
        image_paths.extend(root.glob(pattern))
    image_paths = image_paths[:num_images]

    if not image_paths:
        return {"error": f"No images found in {dataset_path}"}

    for image_path in image_paths[:warmup]:
        detector.predict(image_path.read_bytes())

    rows = []
    for image_path in image_paths:
        start = time.perf_counter()
        result = detector.predict(image_path.read_bytes())
        rows.append(
            {
                "image": image_path.name,
                "inference_time_ms": round((time.perf_counter() - start) * 1000, 1),
                "detected": result["detected"],
                "fracture_type": result["fracture_type"],
                "confidence": result["confidence"],
            }
        )

    times = [row["inference_time_ms"] for row in rows]
    stats = {
        "total_images": len(rows),
        "detected_count": sum(1 for row in rows if row["detected"]),
        "avg_inference_ms": round(sum(times) / len(times), 1),
        "min_inference_ms": min(times),
        "max_inference_ms": max(times),
        "p50_inference_ms": sorted(times)[len(times) // 2],
        "p95_inference_ms": sorted(times)[min(int(len(times) * 0.95), len(times) - 1)],
        "hardware_info": detector.device_info,
        "detailed_results": rows,
    }

    output_path = Path(__file__).resolve().parent / "benchmark_results.json"
    output_path.write_text(json.dumps(stats, indent=2, default=str), encoding="utf-8")
    print(json.dumps(stats, indent=2, default=str))
    print(f"Results saved to: {output_path}")
    return stats


def main() -> int:
    parser = argparse.ArgumentParser(description="Benchmark universal fracture detection")
    parser.add_argument("--dataset", required=True, help="Folder containing X-ray images")
    parser.add_argument("--num-images", type=int, default=50)
    parser.add_argument("--warmup", type=int, default=5)
    args = parser.parse_args()

    try:
        run_benchmark(args.dataset, args.num_images, args.warmup)
    except ModelNotReadyError as exc:
        print(f"Model not ready: {exc}")
        return 2
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
