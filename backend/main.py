"""HealthMitra Scan – FastAPI Application Entry Point"""
import sys
import os

# Add backend directory to path
sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from database import init_db
from config import APP_NAME, APP_VERSION, CORS_ORIGINS, UPLOAD_DIR

from routers import reports, risk, patients, dashboard, health_twin, xray_agent, chat
from routers import auth

from contextlib import asynccontextmanager

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup
    init_db()
    print(f"\n[HealthMitra] {APP_NAME} v{APP_VERSION}")
    print(f"[HealthMitra] Upload directory: {UPLOAD_DIR}")
    print("[HealthMitra] API docs: http://localhost:8000/docs\n")
    yield

# Initialize FastAPI app
app = FastAPI(
    title=APP_NAME,
    version=APP_VERSION,
    description="AI-powered offline health assistant for rural India",
    lifespan=lifespan
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Static files – serve uploads including profile photos
app.mount("/uploads", StaticFiles(directory=UPLOAD_DIR, check_dir=False), name="uploads")

# Register routers
app.include_router(auth.router)
app.include_router(reports.router)
app.include_router(risk.router)
app.include_router(patients.router)
app.include_router(dashboard.router)
app.include_router(health_twin.router)
app.include_router(xray_agent.router)
app.include_router(chat.router)


@app.get("/")
def root():
    return {
        "name": APP_NAME,
        "version": APP_VERSION,
        "endpoints": {
            "auth": "/api/auth",
            "reports": "/api/reports",
            "risk": "/api/risk",
            "patients": "/api/patients",
            "xray_agent": "/api/xray-agent",
            "chat": "/api/chat",
        }
    }


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="0.0.0.0", port=8000, reload=False)
