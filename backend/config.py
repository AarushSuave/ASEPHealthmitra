"""HealthMitra Scan – Configuration"""
import os
import secrets


def _clean_env(name: str, default: str = "") -> str:
    return os.getenv(name, default).strip()


BASE_DIR = os.path.dirname(os.path.abspath(__file__))
DATABASE_URL = "sqlite:///./healthmitra_v2.db"
UPLOAD_DIR = os.path.join(BASE_DIR, "uploads")
MODELS_DIR = os.path.join(BASE_DIR, "models")
PROFILE_PHOTO_DIR = os.path.join(UPLOAD_DIR, "profiles")
for _path in (UPLOAD_DIR, MODELS_DIR, PROFILE_PHOTO_DIR):
    try:
        os.makedirs(_path, exist_ok=True)
    except PermissionError:
        # Keep imports/startup resilient; write endpoints will surface a clear
        # filesystem error if the runtime account truly cannot create uploads.
        pass

# JWT Auth settings
JWT_SECRET = os.getenv("JWT_SECRET", secrets.token_hex(32))
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_HOURS = 72

# Ollama settings
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "phi3")

# Gemini API settings (optional report explanations)
GEMINI_API_KEY = _clean_env("GEMINI_API_KEY", "AIzaSyBl6K7mPmwbEEmrUXWemi_Zy98an5rBzLQ")

# Tesseract OCR settings
TESSERACT_CMD = os.getenv("TESSERACT_CMD", r"C:\Program Files\Tesseract-OCR\tesseract.exe")

# Whisper STT settings
WHISPER_MODEL_SIZE = os.getenv("WHISPER_MODEL_SIZE", "base")  # tiny, base, small, medium, large

# YOLOv8 settings
YOLO_MODEL_NAME = os.getenv("YOLO_MODEL_NAME", "yolov8n.pt")  # nano model for speed
YOLO_CONFIDENCE_THRESHOLD = float(os.getenv("YOLO_CONFIDENCE", "0.25"))

# App settings
APP_NAME = "HealthMitra Scan"
APP_VERSION = "2.0.0"
CORS_ORIGINS = ["http://localhost:5173", "http://localhost:3000", "http://127.0.0.1:5173"]
