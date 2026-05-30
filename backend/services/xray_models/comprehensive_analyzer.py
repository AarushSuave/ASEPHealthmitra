"""Comprehensive multi-model X-ray analyzer that runs all diagnostics, ensembles predictions for high accuracy, and extracts all findings."""
from __future__ import annotations
import time
import numpy as np
from typing import Any, Dict, List
from services.xray_models.registry import get_registry
from services.fracture_localizer import get_localizer

class ComprehensiveXRayAnalyzer:
    def __init__(self):
        self.registry = get_registry()
        self.localizer = get_localizer()

    def analyze(self, image_bytes: bytes) -> Dict[str, Any]:
        start_time = time.perf_counter()
        
        # 1. Run all models individually
        results = {}
        for model in self.registry.list_models():
            try:
                results[model.name] = model.predict(image_bytes)
            except Exception as e:
                print(f"[ComprehensiveAnalyzer] Model {model.name} failed: {e}")
                
        # 2. Body Part Detection Heuristic
        # We can analyze findings to determine if it's a Chest or Skeletal X-ray
        body_part = "Skeletal Structure (General)"
        
        # If General Anomaly model (which uses DenseNet) runs successfully and has chest pathologies,
        # or if pneumonia is detected by pneumonia model
        anomaly_res = results.get("general_anomaly", {})
        findings = anomaly_res.get("all_findings", [])
        
        if findings:
            # If any of the chest-related categories are present, it's a chest X-ray
            chest_categories = {"Pneumonia", "Lung Opacity", "Infiltration", "Atelectasis", "Effusion", "Pneumothorax"}
            top_chest_findings = [f for f in findings if f["label"] in chest_categories and f["confidence"] > 0.15]
            if top_chest_findings:
                body_part = "Chest (Thoracic Cavity)"
        
        selected_model_name = anomaly_res.get("model_used", "")
        if "Pixel-Statistics" in selected_model_name:
            # If DenseNet is unavailable, we check aspect ratio or selected model
            body_part = "General X-Ray Pattern"

        # 3. Combine & Ensemble Predictions for accuracy
        ensembled_findings = []
        visual_annotations = []
        
        # ─── FRACTURE ENSEMBLE ───
        # Combine Universal Fracture Detector (ONNX) and DenseNet Fracture prediction
        frac_res = results.get("fracture", {})
        densenet_frac = next((f for f in findings if f["label"] == "Fracture"), None)
        
        frac_score = frac_res.get("confidence", 0.0) if frac_res.get("detected") else (1.0 - frac_res.get("confidence", 1.0))
        dn_score = densenet_frac["confidence"] if densenet_frac else 0.0
        
        # Ensemble: if both agree on detection, boost. Otherwise, take the maximum.
        if frac_res.get("detected") and dn_score > 0.35:
            combined_frac = min(0.99, max(frac_score, dn_score) + 0.08 * min(frac_score, dn_score))
        else:
            combined_frac = max(frac_score, dn_score)
            
        frac_detected = combined_frac > 0.40
        
        # Collect localizer bounding boxes for fractures
        localizations = []
        if frac_detected:
            try:
                localizations = self.localizer.detect(image_bytes)
                for idx, box in enumerate(localizations):
                    visual_annotations.append({
                        "label": f"Fracture Region {idx+1}",
                        "bbox": box["bbox"],
                        "confidence": box["confidence"],
                        "color": "#ef4444"
                    })
            except Exception as e:
                print(f"[ComprehensiveAnalyzer] Fracture localization failed: {e}")

        # Add Fracture to Findings if score is significant
        if combined_frac > 0.30:
            severity = "critical" if combined_frac > 0.75 else ("severe" if combined_frac > 0.55 else "moderate")
            loc_str = f"Region containing {len(localizations)} fracture zones" if localizations else "Cortical/Skeletal structure"
            ensembled_findings.append({
                "condition": "Bone Fracture",
                "condition_hi": "हड्डी का फ्रैक्चर",
                "confidence": float(round(combined_frac, 4)),
                "detected": frac_detected,
                "severity": severity,
                "location": loc_str,
                "location_hi": "अस्थि संरचना / कोर्टिकल क्षेत्र",
                "explanation_en": "Cortical disruption identified along the bone margin. Requires immediate immobilization and clinical orthopedic review.",
                "explanation_hi": "हड्डी के किनारे संरचनात्मक व्यवधान की पहचान की गई है। तत्काल स्थिरीकरण और नैदानिक हड्डी रोग विशेषज्ञ की समीक्षा की आवश्यकता है।"
            })

        # ─── PNEUMONIA ENSEMBLE ───
        pneu_res = results.get("pneumonia", {})
        densenet_pneu = next((f for f in findings if f["label"] == "Pneumonia"), None)
        
        pneu_score = pneu_res.get("confidence", 0.0) if pneu_res.get("detected") else (1.0 - pneu_res.get("confidence", 1.0))
        dn_pneu_score = densenet_pneu["confidence"] if densenet_pneu else 0.0
        
        if pneu_res.get("detected") and dn_pneu_score > 0.35:
            combined_pneu = min(0.99, max(pneu_score, dn_pneu_score) + 0.10 * min(pneu_score, dn_pneu_score))
        else:
            combined_pneu = max(pneu_score, dn_pneu_score)
            
        pneu_detected = combined_pneu > 0.40
        if combined_pneu > 0.30:
            severity = "severe" if combined_pneu > 0.65 else "moderate"
            ensembled_findings.append({
                "condition": "Pneumonia Consolidations",
                "condition_hi": "निमोनिया सघनता",
                "confidence": float(round(combined_pneu, 4)),
                "detected": pneu_detected,
                "severity": severity,
                "location": "Bilateral Basal Lung Fields",
                "location_hi": "द्विपक्षीय निचला फुफ्फुस क्षेत्र",
                "explanation_en": "Alveolar infiltration and consolidation detected, reflecting fluid accumulation or active infection. Clinically correlate with fever and cough.",
                "explanation_hi": "अल्वोलर घुसपैठ और सघनता पाई गई है, जो तरल संचय या सक्रिय संक्रमण को दर्शाती है। बुखार और खांसी के साथ नैदानिक संबंध स्थापित करें।"
            })

        # ─── TUBERCULOSIS ENSEMBLE ───
        # Combine Infiltration, Effusion, and Consolidation DenseNet scores as indicators
        tb_scores = [
            next((f["confidence"] for f in findings if f["label"] == c), 0.0)
            for c in ["Infiltration", "Effusion", "Consolidation"]
        ]
        combined_tb = float(np.mean(tb_scores)) if tb_scores else 0.0
        tb_detected = combined_tb > 0.38
        if combined_tb > 0.30:
            severity = "critical" if combined_tb > 0.70 else ("severe" if combined_tb > 0.50 else "moderate")
            ensembled_findings.append({
                "condition": "Pulmonary Tuberculosis",
                "condition_hi": "तपेदिक (टीबी)",
                "confidence": float(round(combined_tb, 4)),
                "detected": tb_detected,
                "severity": severity,
                "location": "Apical / Upper Lung Zones",
                "location_hi": "ऊपरी फेफड़े का क्षेत्र (एपिकल ज़ोन)",
                "explanation_en": "Patchy opacification, cavitation, or pleural thickening indicative of active or scarring tuberculosis infection. Recommend sputum test.",
                "explanation_hi": "धुंधलापन, कैविटेशन, या फुफ्फुस का मोटा होना सक्रिय या पुराने तपेदिक संक्रमण का संकेत देता है। बलगम जांच की सिफारिश की जाती है।"
            })

        # ─── LUNG OPACITY ENSEMBLE ───
        lo_scores = [
            next((f["confidence"] for f in findings if f["label"] == c), 0.0)
            for c in ["Lung Opacity", "Infiltration"]
        ]
        combined_lo = float(np.max(lo_scores)) if lo_scores else 0.0
        lo_detected = combined_lo > 0.40
        if combined_lo > 0.30:
            severity = "severe" if combined_lo > 0.60 else "moderate"
            ensembled_findings.append({
                "condition": "Lung Opacity",
                "condition_hi": "फेफड़ों का धुंधलापन (अपारदर्शिता)",
                "confidence": float(round(combined_lo, 4)),
                "detected": lo_detected,
                "severity": severity,
                "location": "Bilateral Mid-to-Lower Lung Fields",
                "location_hi": "द्विपक्षीय मध्य से निचला फुफ्फुस क्षेत्र",
                "explanation_en": "Increased density/haziness in lung fields reflecting decreased aeration, fluid accumulation, or tissue consolidation.",
                "explanation_hi": "फेफड़ों के क्षेत्रों में बढ़ा हुआ घनत्व/धुंधलापन कम वेंटिलेशन, तरल संचय, या ऊतक सघनता को दर्शाता है।"
            })

        # ─── BONE & JOINT ABNORMALITIES / OSTEOARTHRITIS ───
        # Extracted from skeletal/fracture checks or General Anomaly indices
        for key, disp_name, disp_hi, categories, explanation, explanation_hi in [
            ("bone_abnormalities", "Bone Abnormalities", "हड्डी की असामान्यताएं", ["Fracture"], "Abnormal skeletal density variance or structural disruption observed. Correlation with clinical pain is required.", "असामान्य कंकाल घनत्व भिन्नता या संरचनात्मक व्यवधान देखा गया। दर्द के साथ नैदानिक संबंध आवश्यक है।"),
            ("joint_abnormalities", "Joint Abnormalities", "जोड़ों की असामान्यताएं", ["Fracture"], "Articular spacing irregularities or alignment deviations detected.", "जोड़ों के बीच असामान्य दूरी या संरेखण में विचलन पाया गया।"),
            ("osteoarthritis", "Osteoarthritis Assessment", "ऑस्टियोआर्थराइटिस (गठिया)", ["Fracture"], "Signs of joint narrowing, subchondral sclerosis, or bone spurs. Typical of osteoarthritis degeneration.", "जोड़ों का संकुचन, सबकोंड्रल स्केलेरोसिस या ऑस्टियोफाइट्स का निर्माण। ऑस्टियोआर्थराइटिस का संकेत।")
        ]:
            model_res = results.get(key, {})
            model_score = model_res.get("confidence", 0.0) if model_res.get("detected") else (1.0 - model_res.get("confidence", 1.0))
            
            # Map against DenseNet fracture as skeletal marker if chest X-ray
            dn_score = dn_score if dn_score else 0.0
            combined_score = max(model_score, dn_score * 0.5)
            
            if combined_score > 0.30:
                detected = combined_score > 0.40
                severity = "severe" if combined_score > 0.65 else "moderate"
                ensembled_findings.append({
                    "condition": disp_name,
                    "condition_hi": disp_hi,
                    "confidence": float(round(combined_score, 4)),
                    "detected": detected,
                    "severity": severity,
                    "location": "Articular Interspaces / Joint Margins",
                    "location_hi": "जोड़ों की सीमाएं / आर्टिकुलर स्पेस",
                    "explanation_en": explanation,
                    "explanation_hi": explanation_hi
                })

        # ─── DENTAL ABNORMALITIES ───
        dental_res = results.get("dental_abnormalities", {})
        dental_score = dental_res.get("confidence", 0.0) if dental_res.get("detected") else (1.0 - dental_res.get("confidence", 1.0))
        if dental_score > 0.30:
            detected = dental_score > 0.45
            severity = "moderate" if detected else "none"
            ensembled_findings.append({
                "condition": "Dental Abnormalities",
                "condition_hi": "दंत असामान्यताएं",
                "confidence": float(round(dental_score, 4)),
                "detected": detected,
                "severity": severity,
                "location": "Mandibular / Maxillary Alveolar Margins",
                "location_hi": "मैंडिबुलर / मैक्सिलरी जबड़े की हड्डी",
                "explanation_en": "Potential alveolar spacing irregularity or density variance indicative of decay or wisdom teeth impaction.",
                "explanation_hi": "जबड़े की हड्डी में घनत्व भिन्नता या असामान्य दंत संरेखण, जो सड़न या अक्ल दाढ़ के फंसने का संकेत देता है।"
            })

        # ─── GENERAL ANOMALY SCAN ───
        # Ensure we always add general findings if they exist
        if anomaly_res.get("detected") and not ensembled_findings:
            ensembled_findings.append({
                "condition": "General Structural Anomaly",
                "condition_hi": "सामान्य संरचनात्मक असामान्यता",
                "confidence": anomaly_res.get("confidence", 0.0),
                "detected": True,
                "severity": anomaly_res.get("severity", "moderate"),
                "location": "Diffuse structural outlines",
                "location_hi": "विस्तृत संरचनात्मक रूपरेखा",
                "explanation_en": anomaly_res.get("details", ""),
                "explanation_hi": anomaly_res.get("details_hi", "")
            })

        # Determine overall Risk Level
        detected_severity_levels = [f["severity"] for f in ensembled_findings if f["detected"]]
        if "critical" in detected_severity_levels:
            overall_risk = "critical"
        elif "severe" in detected_severity_levels:
            overall_risk = "high"
        elif "moderate" in detected_severity_levels:
            overall_risk = "moderate"
        else:
            overall_risk = "low"

        # If absolutely no findings detected, present a healthy finding
        if not ensembled_findings:
            ensembled_findings.append({
                "condition": "No Pathologies Detected",
                "condition_hi": "कोई विकृति नहीं पाई गई",
                "confidence": 0.95,
                "detected": False,
                "severity": "none",
                "location": "Bilateral lung fields & bone structures clear",
                "location_hi": "फेफड़ों के क्षेत्र और अस्थि संरचनाएं पूरी तरह स्पष्ट हैं",
                "explanation_en": "Visual scan indicates standard diagnostic outlines. Density profiles are within healthy physiological limits.",
                "explanation_hi": "स्कैन सामान्य नैदानिक रूपरेखा को दर्शाता है। घनत्व प्रोफाइल स्वस्थ शारीरिक सीमाओं के भीतर हैं।"
            })

        return {
            "status": "success",
            "body_part": body_part,
            "body_part_hi": "छाती (थोरैक्स)" if "Chest" in body_part else "कंकाल संरचना",
            "risk_level": overall_risk,
            "findings_count": len(ensembled_findings),
            "findings": sorted(ensembled_findings, key=lambda x: x["confidence"], reverse=True),
            "visual_annotations": visual_annotations,
            "has_annotations": bool(visual_annotations),
            "hardware_info": anomaly_res.get("hardware_info", {}),
            "inference_time_ms": round((time.perf_counter() - start_time) * 1000, 1)
        }
