"""Vendor-neutral hardware detection for local inference."""

from __future__ import annotations

import importlib.util
import platform
import sys
from typing import Any, Dict

try:
    import psutil
except ImportError:  # pragma: no cover - setup should install this
    psutil = None


class HardwareDetector:
    """Detects available compute backends without vendor-specific branching."""

    @staticmethod
    def detect_all(deep: bool = True) -> Dict[str, Any]:
        ram_gb = 0
        cpu_count = None
        cpu_physical = None
        if psutil is not None:
            ram_gb = round(psutil.virtual_memory().total / (1024**3), 2)
            cpu_count = psutil.cpu_count(logical=True)
            cpu_physical = psutil.cpu_count(logical=False)

        info: Dict[str, Any] = {
            "platform": platform.system(),
            "platform_release": platform.release(),
            "processor": platform.processor(),
            "architecture": platform.machine(),
            "python_version": sys.version,
            "ram_gb": ram_gb,
            "cpu_count": cpu_count,
            "cpu_physical_cores": cpu_physical,
            "tensorflow_devices": [],
            "pytorch_devices": [],
            "onnx_providers": [],
            "available_accelerators": [],
            "installed_backends": {
                "tensorflow": importlib.util.find_spec("tensorflow") is not None,
                "torch": importlib.util.find_spec("torch") is not None,
                "onnxruntime": importlib.util.find_spec("onnxruntime") is not None,
                "ultralytics": importlib.util.find_spec("ultralytics") is not None,
                "openvino": importlib.util.find_spec("openvino") is not None,
            },
        }

        if not deep:
            info["available_accelerators"] = ["CPU"]
            return info

        HardwareDetector._detect_tensorflow(info)
        HardwareDetector._detect_pytorch(info)
        HardwareDetector._detect_onnx(info)
        HardwareDetector._detect_openvino(info)

        if not info["available_accelerators"]:
            info["available_accelerators"].append("CPU")
        info["available_accelerators"] = sorted(set(info["available_accelerators"]))
        return info

    @staticmethod
    def _detect_tensorflow(info: Dict[str, Any]) -> None:
        try:
            import tensorflow as tf

            gpus = tf.config.list_physical_devices("GPU")
            if gpus:
                for gpu in gpus:
                    info["tensorflow_devices"].append({"name": gpu.name, "device_type": "GPU"})
                    info["available_accelerators"].append("GPU")
            else:
                info["tensorflow_devices"].append({"name": "CPU", "device_type": "CPU"})
                info["available_accelerators"].append("CPU")
        except Exception as exc:
            info["tensorflow_devices"] = [{"name": f"TensorFlow unavailable: {exc}", "device_type": "N/A"}]

    @staticmethod
    def _detect_pytorch(info: Dict[str, Any]) -> None:
        try:
            import torch

            if torch.cuda.is_available():
                info["pytorch_devices"].append(
                    {"name": f"CUDA: {torch.cuda.get_device_name(0)}", "device_type": "CUDA"}
                )
                info["available_accelerators"].append("CUDA")
            elif hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                info["pytorch_devices"].append({"name": "Apple Metal (MPS)", "device_type": "MPS"})
                info["available_accelerators"].append("Metal")
            else:
                info["pytorch_devices"].append({"name": "CPU", "device_type": "CPU"})
                info["available_accelerators"].append("CPU")
        except Exception as exc:
            info["pytorch_devices"] = [{"name": f"PyTorch unavailable: {exc}", "device_type": "N/A"}]

    @staticmethod
    def _detect_onnx(info: Dict[str, Any]) -> None:
        try:
            import onnxruntime as ort

            providers = ort.get_available_providers()
            info["onnx_providers"] = providers
            provider_map = {
                "CUDA": "CUDA",
                "TensorRT": "TensorRT",
                "Dml": "DirectML",
                "DirectML": "DirectML",
                "OpenVINO": "OpenVINO",
                "CoreML": "CoreML",
                "NNAPI": "NNAPI",
                "CPU": "CPU",
            }
            for provider in providers:
                for token, label in provider_map.items():
                    if token in provider:
                        info["available_accelerators"].append(label)
        except Exception as exc:
            info["onnx_providers"] = [f"ONNX Runtime unavailable: {exc}"]

    @staticmethod
    def _detect_openvino(info: Dict[str, Any]) -> None:
        try:
            from openvino.runtime import Core

            devices = Core().available_devices
            info["available_accelerators"].extend(devices)
        except Exception:
            pass

    @staticmethod
    def get_best_tensorflow_device() -> str:
        try:
            import tensorflow as tf

            return "GPU" if tf.config.list_physical_devices("GPU") else "CPU"
        except Exception:
            return "CPU"

    @staticmethod
    def get_best_pytorch_device() -> str:
        try:
            import torch

            if torch.cuda.is_available():
                return "cuda"
            if hasattr(torch.backends, "mps") and torch.backends.mps.is_available():
                return "mps"
        except Exception:
            pass
        return "cpu"
