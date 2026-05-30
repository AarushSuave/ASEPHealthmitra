"""Base class for all modular X-ray diagnostic models."""
from __future__ import annotations
from abc import ABC, abstractmethod
from typing import Any, Dict, List

class BaseXRayModel(ABC):
    @property
    @abstractmethod
    def name(self) -> str:
        """Unique identifier/slug for the model."""
        pass

    @property
    @abstractmethod
    def display_name(self) -> str:
        """User-facing display name."""
        pass

    @property
    @abstractmethod
    def target_conditions(self) -> List[str]:
        """List of specific diagnostic targets/conditions this model specializes in."""
        pass

    @property
    @abstractmethod
    def description(self) -> str:
        """Brief description of what the model analyzes."""
        pass

    @abstractmethod
    def is_available(self) -> bool:
        """Checks if the specialized model weights are installed/ready."""
        pass

    @abstractmethod
    def predict(self, image_bytes: bytes) -> Dict[str, Any]:
        """Runs the diagnostic inference pipeline and returns standard outputs.
        
        Returns a dict:
            {
                "detected": bool,
                "confidence": float,
                "label": str,
                "label_hi": str,
                "details": str,
                "details_hi": str,
                "is_fallback": bool,
                "fallback_reason": str | None,
                "simulation": bool,
                "model_used": str,
                "all_findings": List[Dict[str, Any]] (optional)
            }
        """
        pass
