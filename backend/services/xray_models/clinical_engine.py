"""Clinical X-Ray Diagnostic Engine implementing state-of-the-art multi-stage diagnostics."""
from __future__ import annotations
import base64
import io
import time
import cv2
import numpy as np
from PIL import Image
from typing import Any, Dict, List, Tuple

import torch
import torch.nn.functional as F
import torchxrayvision as xrv
from torchvision.transforms import Resize, InterpolationMode

from services.xray_models.registry import get_registry
from services.fracture_localizer import get_localizer

# Lazy singletons for deep learning
_xrv_model = None

def _get_xrv_model():
    global _xrv_model
    if _xrv_model is None:
        try:
            _xrv_model = xrv.models.DenseNet(weights="densenet121-res224-all")
            _xrv_model.eval()
        except Exception as e:
            print(f"[ClinicalEngine] Failed to load torchxrayvision model: {e}")
            _xrv_model = None
    return _xrv_model


class ClinicalXRayEngine:
    def __init__(self):
        self.registry = get_registry()
        self.localizer = get_localizer()

    def run_diagnostics(self, image_bytes: bytes, accuracy_first: bool = False) -> Dict[str, Any]:
        start_time = time.perf_counter()
        
        # ── STAGE 1: QUALITY CONTROL (QC) ───────────────────────────────────────
        qc_report, cv_img_bgr, cv_img_grey = self._run_quality_control(image_bytes)
        
        if not qc_report["is_valid_xray"]:
            # Hard stop if not a valid X-ray
            return {
                "status": "rejected",
                "qc": qc_report,
                "findings": [],
                "visual_annotations": [],
                "inference_time_ms": round((time.perf_counter() - start_time) * 1000, 1),
                "error_message": "The uploaded image was rejected by Quality Control. " + " ".join(qc_report["warnings"])
            }

        # ── STAGE 2: ADVANCED PREPROCESSING ─────────────────────────────────────
        preprocessed_img_grey, preprocessed_img_normalized = self._preprocess_image(cv_img_grey, accuracy_first)
        
        # Convert preprocessed image to BGR for heatmap blending later
        standardized_bgr = cv2.cvtColor(preprocessed_img_grey, cv2.COLOR_GRAY2BGR)
        
        # ── STAGE 3: BODY PART CLASSIFICATION ──────────────────────────────────
        body_part, chest_pathology_probs = self._classify_body_part(preprocessed_img_normalized, cv_img_grey)

        # ── STAGE 4: MODEL ROUTING & ENSEMBLE PREDICTIONS ───────────────────────
        ensembled_findings = []
        visual_annotations = []
        heatmaps = {}

        # Get models from registry
        models_dict = {m.name: m for m in self.registry.list_models()}

        # 1. Chest Pathology Routing
        if body_part == "Chest (Thorax)":
            # Run Pneumonia, Tuberculosis, and Lung Opacity models
            chest_conditions = ["pneumonia", "tuberculosis", "lung_opacity"]
            for cond in chest_conditions:
                model = models_dict.get(cond)
                if model:
                    try:
                        # Feed the original image bytes for standard predictions
                        res = model.predict(image_bytes)
                        
                        # Apply test-time augmentation (TTA) if accuracy-first mode is enabled
                        if accuracy_first:
                            tta_score = self._run_test_time_augmentation(model, image_bytes)
                            res["confidence"] = 0.7 * tta_score + 0.3 * res["confidence"]
                            res["detected"] = res["confidence"] > 0.40
                        
                        # Save finding
                        ensembled_findings.append({
                            "condition_key": cond,
                            "condition": model.display_name,
                            "target_conditions": model.target_conditions,
                            "confidence": res["confidence"],
                            "detected": res["detected"],
                            "details": res["details"],
                            "details_hi": res["details_hi"],
                            "severity": res.get("severity", "moderate") if res["detected"] else "none",
                            "location": "Bilateral Basal Lung Fields" if cond == "pneumonia" else ("Apical / Upper Lung Zones" if cond == "tuberculosis" else "Bilateral Lung Fields"),
                            "is_fallback": res.get("is_fallback", False)
                        })
                    except Exception as e:
                        print(f"[ClinicalEngine] Failed to run {cond} model: {e}")

            # Generate Grad-CAM heatmaps for chest conditions using the loaded DenseNet
            dl_model = _get_xrv_model()
            if dl_model is not None and chest_pathology_probs:
                for idx, path_name in enumerate(dl_model.pathologies):
                    # We map DenseNet categories directly to active findings
                    mapped_key = self._map_densenet_pathology_to_key(path_name)
                    if mapped_key in chest_conditions:
                        score = chest_pathology_probs[idx]
                        if score > 0.30:  # only generate if positive signature is moderate
                            heatmap_b64 = self._generate_cam_heatmap(dl_model, preprocessed_img_normalized, idx, standardized_bgr)
                            if heatmap_b64:
                                heatmaps[mapped_key] = heatmap_b64

        # 2. Skeletal / Joints Routing
        elif body_part == "Skeletal (Limbs/Knee/Spine)":
            skeletal_conditions = ["fracture", "bone_abnormalities", "joint_abnormalities", "osteoarthritis"]
            for cond in skeletal_conditions:
                model = models_dict.get(cond)
                if model:
                    try:
                        res = model.predict(image_bytes)
                        
                        if accuracy_first:
                            tta_score = self._run_test_time_augmentation(model, image_bytes)
                            res["confidence"] = 0.7 * tta_score + 0.3 * res["confidence"]
                            res["detected"] = res["confidence"] > 0.40
                        
                        ensembled_findings.append({
                            "condition_key": cond,
                            "condition": model.display_name,
                            "target_conditions": model.target_conditions,
                            "confidence": res["confidence"],
                            "detected": res["detected"],
                            "details": res["details"],
                            "details_hi": res["details_hi"],
                            "severity": res.get("severity", "moderate") if res["detected"] else "none",
                            "location": "Articular Interspaces / Joint Margins" if cond != "fracture" else "Cortical structure",
                            "is_fallback": res.get("is_fallback", False)
                        })
                    except Exception as e:
                        print(f"[ClinicalEngine] Failed to run skeletal model {cond}: {e}")

            # Collect localization annotations for fractures specifically
            fracture_res = next((f for f in ensembled_findings if f["condition_key"] == "fracture"), None)
            if fracture_res and fracture_res["detected"]:
                try:
                    boxes = self.localizer.detect(image_bytes)
                    for b_idx, box in enumerate(boxes):
                        visual_annotations.append({
                            "label": f"Fracture Zone {b_idx+1}",
                            "bbox": box["bbox"],
                            "confidence": box["confidence"],
                            "color": "#ef4444"
                        })
                except Exception as e:
                    print(f"[ClinicalEngine] Fracture localizer error: {e}")

        # 3. Dental Routing
        elif body_part == "Dental / Jaw":
            model = models_dict.get("dental_abnormalities")
            if model:
                try:
                    res = model.predict(image_bytes)
                    ensembled_findings.append({
                        "condition_key": "dental_abnormalities",
                        "condition": model.display_name,
                        "target_conditions": model.target_conditions,
                        "confidence": res["confidence"],
                        "detected": res["detected"],
                        "details": res["details"],
                        "details_hi": res["details_hi"],
                        "severity": res.get("severity", "moderate") if res["detected"] else "none",
                        "location": "Mandibular / Maxillary Alveolar Margins",
                        "is_fallback": res.get("is_fallback", False)
                    })
                except Exception as e:
                    print(f"[ClinicalEngine] Failed to run dental model: {e}")

        # ── STAGE 5: SECONDARY CONSENSUS VERIFICATION ──────────────────────────
        # Cross-check predictions against DenseNet scores for chest views to reduce false positives
        dl_model = _get_xrv_model()
        final_findings = []
        
        for finding in ensembled_findings:
            key = finding["condition_key"]
            spec_score = finding["confidence"] if finding["detected"] else (1.0 - finding["confidence"])
            
            # Map to DenseNet categories for chest verification
            dn_idx = self._map_key_to_densenet_idx(key)
            if dl_model is not None and dn_idx is not None and chest_pathology_probs:
                validation_score = chest_pathology_probs[dn_idx]
                
                # Consensus check: if models disagree by more than 0.40, mark as Uncertain
                discrepancy = abs(spec_score - validation_score)
                if discrepancy > 0.40:
                    finding["verification"] = "uncertain"
                    finding["confidence"] = 0.5 * spec_score + 0.5 * validation_score
                    finding["details"] += " (Uncertain Finding: validation models show significant discrepancy)."
                    finding["details_hi"] += " (अनिश्चित खोज: सत्यापन मॉडल महत्वपूर्ण विसंगति दिखाते हैं।)"
                else:
                    finding["verification"] = "confirmed" if spec_score > 0.65 else "probable"
            else:
                # If non-chest or validation is unavailable, standard categorization based on score
                finding["verification"] = "confirmed" if spec_score > 0.75 else ("probable" if spec_score > 0.50 else "possible")
            
            # ── STAGE 6: RESULT CATEGORIZATION ─────────────────────────────────
            # Assign final presentation group
            if not finding["detected"]:
                finding["category"] = "no_abnormality"
            elif finding.get("verification") == "uncertain":
                finding["category"] = "possible"  # demote uncertain to possible
            elif finding["confidence"] > 0.75:
                finding["category"] = "confirmed"
            elif finding["confidence"] > 0.50:
                finding["category"] = "probable"
            else:
                finding["category"] = "possible"

            final_findings.append(finding)

        # 4. Overall Anomaly scanning if no specific target findings exist
        if not final_findings:
            gen_model = models_dict.get("general_anomaly")
            if gen_model:
                res = gen_model.predict(image_bytes)
                final_findings.append({
                    "condition_key": "general_anomaly",
                    "condition": "General Anomaly Pattern",
                    "target_conditions": gen_model.target_conditions,
                    "confidence": res["confidence"],
                    "detected": res["detected"],
                    "details": res["details"],
                    "details_hi": res["details_hi"],
                    "severity": res.get("severity", "moderate") if res["detected"] else "none",
                    "location": "Diffuse tissue outlines",
                    "verification": "probable" if res["detected"] else "none",
                    "category": "confirmed" if (res["detected"] and res["confidence"] > 0.75) else ("possible" if res["detected"] else "no_abnormality")
                })

        # Calculate overall clinical risk
        detected_severity = [f["severity"] for f in final_findings if f["detected"]]
        if "critical" in detected_severity:
            overall_risk = "critical"
        elif "severe" in detected_severity:
            overall_risk = "high"
        elif "moderate" in detected_severity:
            overall_risk = "moderate"
        else:
            overall_risk = "low"

        return {
            "status": "success",
            "body_part": body_part,
            "body_part_hi": "छाती (थोरैक्स)" if body_part == "Chest (Thorax)" else ("दंत जबड़ा" if body_part == "Dental / Jaw" else "कंकाल संरचना"),
            "risk_level": overall_risk,
            "qc": qc_report,
            "findings": sorted(final_findings, key=lambda x: x["confidence"], reverse=True),
            "visual_annotations": visual_annotations,
            "has_annotations": bool(visual_annotations),
            "heatmaps": heatmaps,
            "has_heatmaps": bool(heatmaps),
            "accuracy_first_mode": accuracy_first,
            "inference_time_ms": round((time.perf_counter() - start_time) * 1000, 1)
        }

    # ------------------------------------------------------------------
    # Pipeline stages implementations
    # ------------------------------------------------------------------

    def _run_quality_control(self, image_bytes: bytes) -> Tuple[Dict[str, Any], np.ndarray, np.ndarray]:
        # Load via OpenCV
        arr = np.frombuffer(image_bytes, np.uint8)
        img_bgr = cv2.imdecode(arr, cv2.IMREAD_COLOR)
        
        if img_bgr is None:
            return {
                "is_valid_xray": False,
                "is_blurry": False,
                "is_poor_quality": True,
                "warnings": ["Failed to decode image file. File may be corrupted."]
            }, None, None

        img_grey = cv2.cvtColor(img_bgr, cv2.COLOR_BGR2GRAY)
        warnings = []
        
        # 1. Non-X-ray check based on color channels variance
        # Medical X-rays are predominantly greyscale, so BGR channels will have minimal variance
        rg_diff = np.abs(img_bgr[:, :, 0].astype(int) - img_bgr[:, :, 1].astype(int)).mean()
        rb_diff = np.abs(img_bgr[:, :, 0].astype(int) - img_bgr[:, :, 2].astype(int)).mean()
        is_colored = (rg_diff + rb_diff) > 25.0
        
        # 2. Exposure checks (over/under exposed)
        mean_brightness = float(np.mean(img_grey))
        is_poor_exposure = mean_brightness < 15.0 or mean_brightness > 240.0
        
        if is_colored:
            warnings.append("Image contains full-color channels. Standard medical X-rays are greyscale.")
        if is_poor_exposure:
            warnings.append(f"Image has extreme average exposure (brightness = {mean_brightness:.1f}).")
            
        # Hard block if colored OR extremely bad exposure (solid color or standard selfie)
        is_valid_xray = not (is_colored or mean_brightness < 5.0 or mean_brightness > 250.0)

        # 3. Blurriness Laplacian check
        laplacian_var = float(cv2.Laplacian(img_grey, cv2.CV_64F).var())
        is_blurry = laplacian_var < 50.0
        
        if is_blurry:
            warnings.append(f"Image appears blurry or low-resolution (focus score = {laplacian_var:.1f}).")

        # 4. Rotation/Aspect ratio warning
        h, w = img_grey.shape
        aspect_ratio = w / h
        if aspect_ratio > 2.0 or aspect_ratio < 0.35:
            warnings.append(f"Extreme aspect ratio ({aspect_ratio:.2f}) may reflect severe cropping or distortion.")

        return {
            "is_valid_xray": is_valid_xray,
            "is_blurry": is_blurry,
            "is_poor_quality": is_poor_exposure or is_blurry,
            "average_brightness": mean_brightness,
            "blur_score": laplacian_var,
            "warnings": warnings
        }, img_bgr, img_grey

    def _preprocess_image(self, img_grey: np.ndarray, accuracy_first: bool) -> Tuple[np.ndarray, np.ndarray]:
        # 1. Remove massive solid black outer borders (DICOM crop)
        _, thresh = cv2.threshold(img_grey, 10, 255, cv2.THRESH_BINARY)
        contours, _ = cv2.findContours(thresh, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        
        cropped_grey = img_grey
        if contours:
            c = max(contours, key=cv2.contourArea)
            x, y, w, h = cv2.boundingRect(c)
            # Crop if contour area covers a reasonable section but filters out thick margins
            if w > img_grey.shape[1] * 0.4 and h > img_grey.shape[0] * 0.4:
                cropped_grey = img_grey[y:y+h, x:x+w]

        # 2. Clinical CLAHE Normalization (adaptive histogram equalization)
        # clipLimit=2.0 is optimal to prevent over-amplifying noise while bringing out consolidations
        clip_limit = 2.5 if accuracy_first else 2.0
        clahe = cv2.createCLAHE(clipLimit=clip_limit, tileGridSize=(8, 8))
        enhanced_grey = clahe.apply(cropped_grey)

        # 3. Resize to standard 224x224 using bilinear interpolation
        standardized_grey = cv2.resize(enhanced_grey, (224, 224), interpolation=cv2.INTER_LINEAR)

        # 4. Normalize to [-1024, 1024] for torchxrayvision deep-learning pipeline
        standardized_norm = (standardized_grey.astype(np.float32) / 255.0) * 2048.0 - 1024.0
        standardized_norm = np.expand_dims(standardized_norm, axis=0)  # (1, H, W)
        standardized_norm = np.expand_dims(standardized_norm, axis=0)  # (1, 1, H, W)

        return standardized_grey, standardized_norm

    def _classify_body_part(self, normalized_img: np.ndarray, original_grey: np.ndarray) -> Tuple[str, List[float] | None]:
        # 1. Try torchxrayvision DenseNet to verify if it's a frontal chest X-ray
        model = _get_xrv_model()
        if model is not None:
            try:
                tensor = torch.from_numpy(normalized_img)
                with torch.no_grad():
                    preds = model(tensor)
                    probs = torch.sigmoid(preds)[0].numpy().tolist()
                
                # Check for high chest pathology signals
                # Atelectasis, Consolidation, Infiltration, Effusion, Pneumonia, Lung Opacity
                # Indexes: Effusion (7), Pneumonia (8), Lung Opacity (16), Infiltration (2), Consolidation (1)
                chest_indices = [1, 2, 7, 8, 16]
                max_chest_sig = max(probs[idx] for idx in chest_indices)
                
                if max_chest_sig > 0.15:
                    return "Chest (Thorax)", probs
            except Exception as e:
                print(f"[ClinicalEngine] Body part classifier DenseNet failed: {e}")

        # 2. Rule-based aspect ratio checks (Dental Panoramic scans are horizontal)
        h, w = original_grey.shape
        aspect_ratio = w / h
        
        if aspect_ratio > 1.75:
            return "Dental / Jaw", None
            
        # Fallback to general skeletal joints/limbs
        return "Skeletal (Limbs/Knee/Spine)", None

    def _run_test_time_augmentation(self, model: BaseXRayModel, image_bytes: bytes) -> float:
        """Runs prediction on augmented images (rotations) to ensemble and reduce false predictions."""
        try:
            # Decode original image
            arr = np.frombuffer(image_bytes, np.uint8)
            img = cv2.imdecode(arr, cv2.IMREAD_GRAYSCALE)
            if img is None:
                return 0.5
                
            scores = []
            # Run predictions on: original, rotated +3 degrees, rotated -3 degrees
            rotations = [0, 3, -3]
            for angle in rotations:
                if angle == 0:
                    aug_bytes = image_bytes
                else:
                    # Apply small rotation
                    h, w = img.shape
                    M = cv2.getRotationMatrix2D((w/2, h/2), angle, 1.0)
                    rotated = cv2.warpAffine(img, M, (w, h), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
                    _, buf = cv2.imencode(".jpg", rotated)
                    aug_bytes = buf.tobytes()
                
                res = model.predict(aug_bytes)
                score = res.get("confidence", 0.0) if res.get("detected") else (1.0 - res.get("confidence", 1.0))
                scores.append(score)
                
            return float(np.mean(scores))
        except Exception as e:
            print(f"[ClinicalEngine] Test-Time Augmentation failed: {e}")
            return 0.5

    def _generate_cam_heatmap(self, model: xrv.models.DenseNet, normalized_img: np.ndarray, class_idx: int, standardized_bgr: np.ndarray) -> str | None:
        """Generates a high-accuracy Class Activation Map (CAM) heatmap for explainability."""
        try:
            # 1. Extract feature map using DenseNet features layer
            tensor = torch.from_numpy(normalized_img)
            with torch.no_grad():
                features = model.features(tensor)  # shape: (1, 1024, 7, 7)
                features_relu = torch.relu(features)[0]  # shape: (1024, 7, 7)
                
                # 2. Extract classification weights mapping to target pathology
                # shape: (18, 1024) -> class weights (1024,)
                weights = model.classifier.weight[class_idx]
                
                # 3. Class Activation Map calculation (Weighted spatial combination)
                cam = torch.zeros(7, 7, dtype=torch.float32)
                for k in range(1024):
                    cam += weights[k] * features_relu[k]
                
                # Keep positive values and normalize
                cam = torch.clamp(cam, min=0)
                cam_min, cam_max = cam.min(), cam.max()
                if cam_max > cam_min:
                    cam = (cam - cam_min) / (cam_max - cam_min)
                else:
                    cam = torch.zeros_like(cam)
                    
                cam_np = cam.numpy()

            # 4. Upscale CAM map to 224x224
            cam_resized = cv2.resize(cam_np, (224, 224), interpolation=cv2.INTER_LINEAR)
            
            # 5. Apply Jet colormap and blend
            cam_color = cv2.applyColorMap(np.uint8(255 * cam_resized), cv2.COLORMAP_JET)
            blended = cv2.addWeighted(standardized_bgr, 0.65, cam_color, 0.35, 0)
            
            # Encode to JPEG base64
            _, buf = cv2.imencode(".jpg", blended)
            base64_str = base64.b64encode(buf.tobytes()).decode("utf-8")
            return f"data:image/jpeg;base64,{base64_str}"
            
        except Exception as e:
            print(f"[ClinicalEngine] CAM generation failed for class {class_idx}: {e}")
            return None

    @staticmethod
    def _map_densenet_pathology_to_key(pathology_name: str) -> str | None:
        mapping = {
            "Pneumonia": "pneumonia",
            "Infiltration": "tuberculosis",
            "Consolidation": "tuberculosis",
            "Lung Opacity": "lung_opacity",
            "Fracture": "fracture"
        }
        return mapping.get(pathology_name)

    @staticmethod
    def _map_key_to_densenet_idx(condition_key: str) -> int | None:
        # Pathology names indices in torchxrayvision DenseNet-121 (densenet121-res224-all)
        # 0: Atelectasis, 1: Consolidation, 2: Infiltration, 7: Effusion, 8: Pneumonia, 15: Fracture, 16: Lung Opacity
        mapping = {
            "pneumonia": 8,
            "tuberculosis": 2,  # check Infiltration as primary marker
            "lung_opacity": 16,
            "fracture": 15
        }
        return mapping.get(condition_key)
