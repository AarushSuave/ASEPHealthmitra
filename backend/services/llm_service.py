"""HealthMitra Scan – LLM Service (Real Ollama Integration)"""
import json
import logging

logger = logging.getLogger(__name__)

# Try to import requests
try:
    import requests
    REQUESTS_AVAILABLE = True
except ImportError:
    REQUESTS_AVAILABLE = False
    logger.warning("requests package not installed. Using fallback responses.")


# ── Fallback responses when Ollama is not available ─────────────────
FALLBACK_EXPLANATIONS = {
    "en": {
        "high": "⚠️ This report shows several concerning values that need immediate medical attention. "
                "Your blood sugar levels are significantly elevated, indicating poorly controlled diabetes. "
                "The lipid profile shows high cholesterol which increases cardiovascular risk. "
                "Kidney function markers are above normal range, suggesting early kidney stress. "
                "Please consult your doctor immediately for medication adjustment and lifestyle changes.",
        "moderate": "📋 This report shows some values that need attention but are not immediately dangerous. "
                    "Your blood sugar is slightly elevated, placing you in the pre-diabetic range. "
                    "Some vitamin levels are low, which can cause fatigue and weakness. "
                    "Thyroid function may need monitoring. "
                    "Recommend dietary improvements, regular exercise, and follow-up tests in 3 months.",
        "low": "✅ Great news! Your report shows mostly normal values. "
               "All major blood markers including blood sugar, cholesterol, kidney and liver function "
               "are within healthy ranges. Continue maintaining your healthy lifestyle with balanced "
               "diet and regular exercise. Recommended routine check-up in 6-12 months."
    },
    "hi": {
        "high": "⚠️ इस रिपोर्ट में कई चिंताजनक मान हैं जिन पर तुरंत ध्यान देने की ज़रूरत है। "
               "आपका ब्लड शुगर बहुत अधिक है, जो डायबिटीज का संकेत है। "
               "कोलेस्ट्रॉल बढ़ा हुआ है जिससे हृदय रोग का खतरा बढ़ जाता है। "
               "किडनी की कार्यप्रणाली पर भी प्रभाव दिख रहा है। "
               "कृपया तुरंत अपने डॉक्टर से मिलें और दवाइयों में बदलाव करवाएं।",
        "moderate": "📋 इस रिपोर्ट में कुछ मान सामान्य से थोड़े अधिक हैं लेकिन तुरंत खतरनाक नहीं हैं। "
                    "ब्लड शुगर थोड़ा बढ़ा हुआ है, जो प्री-डायबिटीज की श्रेणी में आता है। "
                    "कुछ विटामिन की कमी है जिससे थकान हो सकती है। "
                    "खान-पान में सुधार, नियमित व्यायाम और 3 महीने बाद दोबारा जांच करवाएं।",
        "low": "✅ बहुत अच्छी खबर! आपकी रिपोर्ट लगभग सभी मान सामान्य श्रेणी में हैं। "
              "ब्लड शुगर, कोलेस्ट्रॉल, किडनी और लिवर की कार्यप्रणाली सब ठीक है। "
              "अपनी स्वस्थ जीवनशैली बनाए रखें। 6-12 महीने बाद नियमित जांच करवाएं।"
    }
}

FALLBACK_QA = {
    "en": "Based on your question, I recommend consulting with a healthcare professional for personalized advice. "
          "In general, maintaining a balanced diet, regular exercise, adequate sleep, and stress management "
          "are key pillars of good health. If you have specific symptoms, please describe them in detail "
          "so I can provide more targeted guidance.",
    "hi": "आपके सवाल के आधार पर, मैं व्यक्तिगत सलाह के लिए स्वास्थ्य विशेषज्ञ से मिलने की सिफारिश करता हूं। "
          "सामान्य तौर पर, संतुलित आहार, नियमित व्यायाम, पर्याप्त नींद और तनाव प्रबंधन अच्छे स्वास्थ्य के "
          "मुख्य आधार हैं। यदि आपके कोई विशेष लक्षण हैं, तो कृपया विस्तार से बताएं।"
}


# ── Ollama LLM calls ────────────────────────────────────────────────
def _check_ollama_running() -> bool:
    """Check if Ollama server is running and accessible."""
    if not REQUESTS_AVAILABLE:
        return False
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=2.0)
        return resp.status_code == 200
    except Exception:
        return False


def _get_available_model() -> str | None:
    """Get the first available model from Ollama."""
    try:
        resp = requests.get("http://localhost:11434/api/tags", timeout=2.0)
        data = resp.json()
        models = data.get('models', [])
        if models and len(models) > 0:
            return models[0].get('name') or models[0].get('model')
        return None
    except Exception:
        return None


def explain_report(report_data: dict, language: str = "en") -> str:
    """
    Explain structured clinical report results in simple language.
    LLM used ONLY for explanation, NEVER for classification.
    """
    if _check_ollama_running():
        model = _get_available_model()
        if model:
            try:
                lang_name = "English" if language == "en" else "Hindi"
                lang_instruction = "in simple English" if language == "en" else "in simple Hindi (Devanagari script)"

                # Masked structured data for LLM
                masked_data = {
                    "red_flags": report_data.get("red_flags", []),
                    "borderline": report_data.get("borderline", []),
                    "risk_scores": report_data.get("risk_scores", {}),
                    "incomplete": report_data.get("incomplete", [])
                }

                prompt = f"""You are HealthMitra, a medical explainer.
Briefly explain these clinical findings {lang_instruction}:
{json.dumps(masked_data, indent=1)}

Rules:
- 2-3 sentences max.
- Simple terms. No jargon.
- Use {lang_name}.
- End with: "Disclaimer: AI info only, consult a doctor."
"""

                payload = {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "stream": False,
                    "options": {"temperature": 0.3}
                }

                resp = requests.post(
                    "http://localhost:11434/api/chat",
                    json=payload,
                    timeout=15.0 # Strict 15s timeout
                )
                if resp.status_code == 200:
                    return resp.json()["message"]["content"]
            except Exception as e:
                logger.error(f"Ollama error: {e}")

    # Fallback logic based on high-level risk
    risk_level = report_data.get("risk_scores", {}).get("cardiovascular", {}).get("level", "low").lower()
    return FALLBACK_EXPLANATIONS.get(language, FALLBACK_EXPLANATIONS["en"]).get(
        risk_level, FALLBACK_EXPLANATIONS["en"]["moderate"]
    )


def answer_health_question(question: str, language: str = "en", context: str = "") -> str:
    """
    Answer a health-related question using LLM.
    Uses Ollama if available, falls back to generic response.
    """
    if _check_ollama_running():
        model = _get_available_model()
        if model:
            try:
                lang_instruction = "in English" if language == "en" else "in Hindi (Devanagari script)"
                context_text = f"\nPatient context: {context}" if context else ""

                prompt = f"""You are HealthMitra, a caring AI health assistant for Indian patients.
Answer the following health question {lang_instruction} in a helpful, empathetic manner.
{context_text}

Important guidelines:
- Give practical, actionable advice
- Mention when to see a doctor
- Reference Indian dietary habits and lifestyle where relevant
- Keep response concise (150-250 words)
- Use emojis for visual clarity
- Always add a disclaimer that this is AI advice, not a replacement for a real doctor

Question: {question}

Your answer:"""

                response = ollama.chat(
                    model=model,
                    messages=[{"role": "user", "content": prompt}],
                    options={"temperature": 0.7, "num_predict": 400}
                )
                return response["message"]["content"]
            except Exception as e:
                logger.error(f"Ollama error: {e}")

    # Fallback
    return FALLBACK_QA.get(language, FALLBACK_QA["en"])


def get_ollama_status() -> dict:
    """Get current Ollama/LLM status for system dashboard."""
    running = _check_ollama_running()
    model = _get_available_model() if running else None

    return {
        "ollama_installed": OLLAMA_AVAILABLE,
        "ollama_running": running,
        "model_loaded": model or "none",
        "status": "online" if running and model else "offline"
    }
