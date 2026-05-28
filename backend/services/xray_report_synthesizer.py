"""HealthMitra Scan – X-Ray Report Synthesizer
Generates a bilingual (English + Hindi) final report using:
  Primary: OpenAI GPT-4o
  Fallback 1: Anthropic Claude 3.5 Sonnet
  Fallback 2: Together AI Llama-3.2-90B
  Fallback 3: Local Ollama (phi3 / llama3)
  Fallback 4: Static template (no API needed)
"""
import os
import logging

logger = logging.getLogger(__name__)

# ── API Client Imports ────────────────────────────────────────────────────────
try:
    from openai import OpenAI
    _OPENAI_AVAILABLE = True
except ImportError:
    _OPENAI_AVAILABLE = False

try:
    import anthropic
    _ANTHROPIC_AVAILABLE = True
except ImportError:
    _ANTHROPIC_AVAILABLE = False

try:
    import requests as _requests
    _REQUESTS_AVAILABLE = True
except ImportError:
    _REQUESTS_AVAILABLE = False


# ── Prompt template ───────────────────────────────────────────────────────────
_REPORT_PROMPT = """You are HealthMitra, an expert medical AI assistant specializing in chest radiology.
You have received the following sequential AI analysis of a chest X-ray:

[VIEW VALIDATION]
- View: {view}
- Confidence: {view_conf}
- Message: {view_message}
{view_warnings_text}

[PNEUMONIA DETECTION – YOLOv8m Chest X-ray Model]
- Detected: {pneumonia_detected}
- Confidence: {pneumonia_conf}
- Details: {pneumonia_details}
- Model: {pneumonia_model}

[FRACTURE DETECTION – {fracture_model}]
- Detected: {fracture_detected}
- Confidence: {fracture_conf}
- Locations: {fracture_locations}
- Description: {fracture_description}

Write a comprehensive structured radiology report in TWO languages sequentially:
1. ENGLISH REPORT (section header: "--- ENGLISH REPORT ---")
2. HINDI REPORT (section header: "--- हिंदी रिपोर्ट ---")

Each report must include:
  a) Findings Summary (2-3 sentences)
  b) Pneumonia Assessment (1-2 sentences with confidence)
  c) Fracture/Structural Assessment (1-2 sentences with confidence)
  d) Clinical Recommendation (1-2 actionable sentences)
  e) Disclaimer (one line: "This is an AI-generated report. Consult a qualified radiologist.")

Keep the English report under 200 words and Hindi report under 200 words.
Use plain language understandable by patients. Include relevant emoji for sections.
"""


def _build_prompt(
    view: dict,
    pneumonia: dict,
    fracture: dict,
) -> str:
    warnings_text = ""
    if view.get("warnings"):
        warnings_text = "- Warnings: " + "; ".join(view["warnings"])

    return _REPORT_PROMPT.format(
        view=view.get("view", "Unknown"),
        view_conf=view.get("confidence", 0),
        view_message=view.get("message", ""),
        view_warnings_text=warnings_text,
        pneumonia_detected="Yes" if pneumonia.get("detected") else "No",
        pneumonia_conf=f"{pneumonia.get('confidence', 0)*100:.1f}%",
        pneumonia_details=pneumonia.get("details", ""),
        pneumonia_model="Simulation" if pneumonia.get("simulation") else "YOLOv8m-chest-xray",
        fracture_detected="Yes" if fracture.get("detected") else "No",
        fracture_conf=f"{fracture.get('confidence', 0)*100:.1f}%",
        fracture_locations=", ".join(fracture.get("locations", [])) or "Not specified",
        fracture_description=fracture.get("description", ""),
        fracture_model=fracture.get("model_used", "Unknown"),
    )


def _call_openai(prompt: str) -> str | None:
    key = os.getenv("OPENAI_API_KEY", "").strip()
    if not _OPENAI_AVAILABLE or not key:
        return None
    try:
        client = OpenAI(api_key=key)
        resp = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "user", "content": prompt}],
            temperature=0.3,
            max_tokens=800,
        )
        return resp.choices[0].message.content
    except Exception as e:
        logger.warning(f"OpenAI call failed: {e}")
        return None


def _call_anthropic(prompt: str) -> str | None:
    key = os.getenv("ANTHROPIC_API_KEY", "").strip()
    if not _ANTHROPIC_AVAILABLE or not key:
        return None
    try:
        client = anthropic.Anthropic(api_key=key)
        msg = client.messages.create(
            model="claude-3-5-sonnet-20241022",
            max_tokens=800,
            messages=[{"role": "user", "content": prompt}],
        )
        return msg.content[0].text
    except Exception as e:
        logger.warning(f"Anthropic call failed: {e}")
        return None


def _call_together(prompt: str) -> str | None:
    key = os.getenv("TOGETHER_API_KEY", "").strip()
    if not _REQUESTS_AVAILABLE or not key:
        return None
    try:
        resp = _requests.post(
            "https://api.together.xyz/v1/chat/completions",
            headers={"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
            json={
                "model": "meta-llama/Llama-3.2-90B-Vision-Instruct-Turbo",
                "messages": [{"role": "user", "content": prompt}],
                "max_tokens": 800,
                "temperature": 0.3,
            },
            timeout=30,
        )
        return resp.json()["choices"][0]["message"]["content"]
    except Exception as e:
        logger.warning(f"Together AI call failed: {e}")
        return None


def _call_ollama(prompt: str) -> str | None:
    if not _REQUESTS_AVAILABLE:
        return None
    try:
        # Try to detect available model
        tags_resp = _requests.get("http://localhost:11434/api/tags", timeout=2)
        if tags_resp.status_code != 200:
            return None
        models = tags_resp.json().get("models", [])
        if not models:
            return None
        model_name = models[0].get("name", "phi3")
        resp = _requests.post(
            "http://localhost:11434/api/chat",
            json={
                "model": model_name,
                "messages": [{"role": "user", "content": prompt}],
                "stream": False,
                "options": {"temperature": 0.3},
            },
            timeout=60,
        )
        return resp.json()["message"]["content"]
    except Exception as e:
        logger.warning(f"Ollama call failed: {e}")
        return None


def _static_report(view: dict, pneumonia: dict, fracture: dict) -> str:
    """Fully offline template-based report. No API required."""
    pn = "🔴 PNEUMONIA DETECTED" if pneumonia.get("detected") else "🟢 No Pneumonia Detected"
    fr = "🔴 FRACTURE DETECTED" if fracture.get("detected") else "🟢 No Fracture Detected"
    pn_conf = f"{pneumonia.get('confidence', 0)*100:.1f}%"
    fr_conf = f"{fracture.get('confidence', 0)*100:.1f}%"
    fr_loc  = ", ".join(fracture.get("locations", [])) or "Not specified"

    en = f"""--- ENGLISH REPORT ---

📋 Findings Summary:
The uploaded image has been analyzed as a {view.get('view', 'chest X-ray')} (confidence: {view.get('confidence', 0):.0%}).
Sequential AI analysis was performed using pneumonia detection and fracture detection models.

🫁 Pneumonia Assessment:
{pn} — Model confidence: {pn_conf}.
{pneumonia.get('details', '')}

🦴 Fracture / Structural Assessment:
{fr} — Model confidence: {fr_conf}.
Locations assessed: {fr_loc}. {fracture.get('description', '')[:150]}

💊 Clinical Recommendation:
{"Consult a pulmonologist immediately for further evaluation and treatment." if pneumonia.get("detected") else "Routine follow-up with your physician is advised."}
{"Orthopedic consultation is recommended for fracture evaluation." if fracture.get("detected") else ""}

⚠️ Disclaimer: This is an AI-generated report. Consult a qualified radiologist."""

    hi = f"""--- हिंदी रिपोर्ट ---

📋 निष्कर्ष सारांश:
अपलोड की गई छवि का विश्लेषण {view.get('view', 'चेस्ट X-रे')} (विश्वसनीयता: {view.get('confidence', 0):.0%}) के रूप में किया गया है।
क्रमिक AI विश्लेषण निमोनिया और फ्रैक्चर डिटेक्शन मॉडल का उपयोग करके किया गया।

🫁 निमोनिया मूल्यांकन:
{("🔴 निमोनिया का पता चला" if pneumonia.get("detected") else "🟢 निमोनिया नहीं मिला")} — मॉडल विश्वसनीयता: {pn_conf}।

🦴 फ्रैक्चर / संरचनात्मक मूल्यांकन:
{("🔴 फ्रैक्चर का पता चला" if fracture.get("detected") else "🟢 कोई फ्रैक्चर नहीं मिला")} — मॉडल विश्वसनीयता: {fr_conf}।
{'स्थान: ' + fr_loc if fr_loc != 'Not specified' else ''}

💊 क्लिनिकल अनुशंसा:
{"तुरंत एक पल्मोनोलॉजिस्ट से परामर्श करें।" if pneumonia.get("detected") else "नियमित अनुवर्ती के लिए अपने चिकित्सक से मिलें।"}
{"फ्रैक्चर मूल्यांकन के लिए ऑर्थोपेडिक परामर्श की सिफारिश की जाती है।" if fracture.get("detected") else ""}

⚠️ अस्वीकरण: यह AI द्वारा उत्पन्न रिपोर्ट है। कृपया एक योग्य रेडियोलॉजिस्ट से परामर्श करें।"""

    return en + "\n\n" + hi


def synthesize_report(view: dict, pneumonia: dict, fracture: dict) -> dict:
    """
    Tries LLM providers in order; falls back to static template.
    Returns:
        {
          "report": str,          # Full bilingual report
          "provider": str,        # Which provider generated the report
          "en_section": str,
          "hi_section": str,
        }
    """
    prompt = _build_prompt(view, pneumonia, fracture)

    report_text = None
    provider = "static"

    for name, fn in [
        ("OpenAI GPT-4o", _call_openai),
        ("Anthropic Claude 3.5", _call_anthropic),
        ("Together Llama-3.2-90B", _call_together),
        ("Ollama (local)", _call_ollama),
    ]:
        result = fn(prompt)
        if result:
            report_text = result
            provider = name
            logger.info(f"Report generated by: {provider}")
            break

    if not report_text:
        report_text = _static_report(view, pneumonia, fracture)
        provider = "Static Template (offline)"

    # Split into language sections
    en_section, hi_section = report_text, ""
    if "--- हिंदी रिपोर्ट ---" in report_text:
        parts = report_text.split("--- हिंदी रिपोर्ट ---", 1)
        en_section = parts[0].strip()
        hi_section = "--- हिंदी रिपोर्ट ---\n" + parts[1].strip()
    elif "--- HINDI REPORT ---" in report_text.upper():
        parts = report_text.upper().split("--- HINDI REPORT ---", 1)
        en_section = report_text[:len(parts[0])].strip()
        hi_section = report_text[len(parts[0]):].strip()

    return {
        "report": report_text,
        "provider": provider,
        "en_section": en_section,
        "hi_section": hi_section,
    }
