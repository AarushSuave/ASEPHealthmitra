# 🏥 HealthMitra Scan  
### *AI Healthcare — Anywhere, Even Without Internet*

<p align="center">
  <img src="https://img.shields.io/badge/Status-Working_Prototype-brightgreen"/>
  <img src="https://img.shields.io/badge/Mode-100%25_Offline-success"/>
  <img src="https://img.shields.io/badge/AI-Computer%20Vision%20%2B%20LLM-blue"/>
  <img src="https://img.shields.io/badge/Built%20For-Rural%20Healthcare-orange"/>
  <img src="https://img.shields.io/badge/Frontend-React%20%2B%20Vite-61DAFB"/>
  <img src="https://img.shields.io/badge/Backend-FastAPI-009688"/>
</p>

---

## 💡 The Problem

Millions of people still struggle with:
- ❌ No access to doctors  
- ❌ Poor understanding of medical reports  
- ❌ No internet for digital health tools  

Healthcare shouldn’t depend on connectivity.

---

## 🚀 The Solution

**HealthMitra Scan** is a **fully offline AI healthcare assistant** that:

- 🩻 Analyzes X-rays  
- 📄 Explains medical reports  
- ❤️ Predicts disease risks  
- 🤖 Answers medical questions  
- 🧑‍⚕️ Helps healthcare workers manage patients  

👉 All running locally. No internet required.

---

## ✨ Features

### 🩻 X-Ray AI Agent
<p align="center">
  <img src="./assets/xray.gif" width="700"/>
</p>

- View validation (AP/PA)
- Pneumonia detection (YOLOv8)
- Fracture detection (ChexFract)
- Bilingual report generation

---

### 📄 Report Explainer
<p align="center">
  <img src="./assets/report.gif" width="700"/>
</p>

- Upload PDF/image  
- OCR + medical value extraction  
- Guideline-based classification  
- Simple explanations (Hindi + English)  

---

### ❤️ Risk Predictor
<p align="center">
  <img src="./assets/risk.gif" width="700"/>
</p>

- Predicts:
  - Diabetes risk  
  - Heart disease risk  
- Detects critical conditions early  

---

### 🤖 Offline Medical Chatbot
<p align="center">
  <img src="./assets/chatbot.gif" width="700"/>
</p>

- Local LLM (Ollama)  
- Medical knowledge base (RAG)  
- Works without internet  

---

### 🏥 Rural ASHA Mode
<p align="center">
  <img src="./assets/rural.gif" width="700"/>
</p>

- Multi-patient management  
- Village clustering  
- Risk prioritization  
- Visit scheduling  

---

## 🔥 Why This Matters

- 🌍 Works in **low-connectivity areas**
- 🔒 Keeps **all data private**
- 🧠 Combines **AI + medical logic**
- ⚡ Enables **early detection & intervention**

---

## 🧠 Tech Stack

### Frontend
- React 18 + Vite

### Backend
- FastAPI + SQLAlchemy + SQLite

### AI / ML
- YOLOv8 (Pneumonia)
- ChexFract (Fractures)
- torchxrayvision (Validation)

### LLM
- Ollama (Phi-3 / Llama 3)
- GPT-4o / Claude (optional fallback)

### Data Processing
- Tesseract OCR
- pdfplumber
- ChromaDB (RAG)

---

## 🧱 Architecture

```mermaid
flowchart TD
    A[Frontend] --> B[FastAPI Backend]
    B --> C[AI Models]
    B --> D[OCR Engine]
    B --> E[LLM Layer]
    B --> F[SQLite DB]
⚡ Quick Start
git clone https://github.com/your-username/healthmitra-scan.git
cd healthmitra-scan
.\run.bat
🌐 Run Locally
Frontend → http://localhost:5173
Backend → http://localhost:8000
Docs → http://localhost:8000/docs
📸 Screenshots
<p align="center"> <img src="./assets/dashboard.png" width="400"/> <img src="./assets/chatbot.png" width="400"/> </p>
🏆 Impact

HealthMitra is designed for:

🏥 Rural clinics
👩‍⚕️ ASHA workers
📄 Patients with no medical knowledge
🌐 Areas with limited internet
🚧 Roadmap
 Mobile app
 Voice-based assistant
 More languages
 Edge AI optimization
👨‍💻 Team

Team: Core 4 Codeers

⭐ Support

If you like this project:

⭐ Star the repo
🔗 Share it
🚀 Build on it
