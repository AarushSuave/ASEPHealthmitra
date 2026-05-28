"""HealthMitra AI Chat – Gemini-powered medical assistant router"""
from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from typing import List
import httpx

from config import GEMINI_API_KEY
from routers.auth import get_current_user

router = APIRouter(prefix="/api/chat", tags=["chat"])
GEMINI_MODELS = [
    "gemini-2.0-flash",
    "gemini-2.0-flash-lite",
    "gemini-1.5-pro",
]

SYSTEM_PROMPT = (
    "You are HealthMitra AI, a compassionate and knowledgeable medical assistant "
    "built to serve patients, ASHA workers, and healthcare providers in India. "
    "You specialize in:\n"
    "• Explaining medical reports in simple language (English & Hinglish)\n"
    "• Providing health guidance for common conditions\n"
    "• Answering questions about medications, symptoms, and preventive care\n"
    "• Supporting rural and underserved communities\n\n"
    "Always recommend consulting a doctor for serious concerns. "
    "Provide clear, empathetic, and actionable advice. "
    "When uncertain, say so honestly and suggest professional medical help."
)


def _fallback_health_reply(question: str) -> str:
    question = question.strip()
    topic = f"about: {question}" if question else "about your health question"
    return (
        f"I'm currently answering in fallback mode because the Gemini API quota is exhausted. "
        f"Here is safe general guidance {topic}\n\n"
        "1. Watch for red-flag symptoms such as severe chest pain, trouble breathing, confusion, fainting, "
        "high fever that does not improve, uncontrolled vomiting, or sudden weakness. If any are present, "
        "seek urgent medical care immediately.\n"
        "2. For mild symptoms, rest, stay hydrated, eat light food, and monitor temperature, pain, sugar, "
        "BP, or oxygen if relevant.\n"
        "3. If symptoms are worsening, lasting more than a few days, or you are pregnant, elderly, or have "
        "diabetes, heart disease, asthma, or kidney problems, consult a doctor soon.\n"
        "4. If you want, ask a more specific question with age, symptoms, duration, medicines taken, and any "
        "test values, and I can give a more focused fallback answer.\n\n"
        "Disclaimer: AI info only, not a diagnosis or replacement for a doctor."
    )


class ChatMessage(BaseModel):
    role: str  # 'user' or 'model'
    content: str


class ChatRequest(BaseModel):
    messages: List[ChatMessage]


@router.post("")
async def chat(req: ChatRequest, current_user=Depends(get_current_user)):
    """Send messages to Gemini and return the AI response."""
    if not GEMINI_API_KEY:
        raise HTTPException(status_code=500, detail="Gemini API key not configured")

    if not req.messages:
        raise HTTPException(status_code=400, detail="At least one message is required")

    # Build Gemini contents array
    contents = []

    for msg in req.messages:
        role = "user" if msg.role == "user" else "model"
        contents.append({
            "role": role,
            "parts": [{"text": msg.content}]
        })

    payload = {
        "system_instruction": {
            "parts": [{"text": SYSTEM_PROMPT}]
        },
        "contents": contents,
        "generationConfig": {
            "temperature": 0.7,
            "maxOutputTokens": 1024,
            "topP": 0.9,
        },
        "safetySettings": [
            {"category": "HARM_CATEGORY_HARASSMENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_HATE_SPEECH", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_SEXUALLY_EXPLICIT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
            {"category": "HARM_CATEGORY_DANGEROUS_CONTENT", "threshold": "BLOCK_MEDIUM_AND_ABOVE"},
        ]
    }

    last_error = None
    data = None

    try:
        async with httpx.AsyncClient(timeout=30.0) as client:
            for model_name in GEMINI_MODELS:
                url = (
                    "https://generativelanguage.googleapis.com/v1beta/models/"
                    f"{model_name}:generateContent?key={GEMINI_API_KEY}"
                )
                response = await client.post(url, json=payload)

                if response.status_code == 200:
                    data = response.json()
                    break

                last_error = response.text
                if response.status_code == 429:
                    latest_user_message = next(
                        (msg.content for msg in reversed(req.messages) if msg.role == "user"),
                        "",
                    )
                    return {"reply": _fallback_health_reply(latest_user_message)}
                # Try the next model only if this one is unavailable.
                if response.status_code != 404:
                    raise HTTPException(status_code=502, detail=f"Gemini API error: {response.text}")
    except httpx.HTTPError as exc:
        raise HTTPException(status_code=502, detail=f"Gemini request failed: {exc}") from exc

    if data is None:
        raise HTTPException(status_code=502, detail=f"Gemini API error: {last_error}")

    try:
        text = data["candidates"][0]["content"]["parts"][0]["text"]
    except (KeyError, IndexError):
        raise HTTPException(status_code=502, detail="Unexpected Gemini response format")

    return {"reply": text}
