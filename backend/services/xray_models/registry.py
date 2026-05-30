"""Registry for all modular X-ray models."""
from __future__ import annotations
from typing import Dict, List, Optional
from services.xray_models.base import BaseXRayModel
from services.xray_models.general_anomaly import GeneralAnomalyModel
from services.xray_models.adapters import (
    FractureModel,
    PneumoniaModel,
    TuberculosisModel,
    LungOpacityModel,
    BoneAbnormalitiesModel,
    JointAbnormalitiesModel,
    OsteoarthritisModel,
    DentalAbnormalitiesModel
)

class XRayModelRegistry:
    def __init__(self):
        self._models: Dict[str, BaseXRayModel] = {}
        
        # Instantiate and register all models
        self.register(GeneralAnomalyModel())
        self.register(FractureModel())
        self.register(PneumoniaModel())
        self.register(TuberculosisModel())
        self.register(LungOpacityModel())
        self.register(BoneAbnormalitiesModel())
        self.register(JointAbnormalitiesModel())
        self.register(OsteoarthritisModel())
        self.register(DentalAbnormalitiesModel())

    def register(self, model: BaseXRayModel) -> None:
        self._models[model.name] = model

    def get_model(self, name: str) -> Optional[BaseXRayModel]:
        return self._models.get(name)

    def list_models(self) -> List[BaseXRayModel]:
        return list(self._models.values())


# Singleton instance of the registry
_registry_instance: Optional[XRayModelRegistry] = None

def get_registry() -> XRayModelRegistry:
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = XRayModelRegistry()
    return _registry_instance
