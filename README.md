# 🏥 HealthMitra Scan  
### *Healthcare Anywhere, Even Without Internet*

<p align="center">
  <img src="https://img.shields.io/badge/Status-Working_Prototype-brightgreen"/>
  <img src="https://img.shields.io/badge/Mode-100%25_Offline-success"/>
  <img src="https://img.shields.io/badge/OCR-Tesseract%20%2B%20Clinical%20Rules-blue"/>
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

**HealthMitra Scan** is a **fully offline healthcare assistant** that:

- 📄 Explains medical reports  
- ❤️ Predicts disease risks  
- 💬 Answers medical questions  
- 🧑‍⚕️ Helps healthcare workers manage patients  

👉 All running locally. No internet required.

---

## ✨ Features

### 📄 Report Explainer
<p align="center">
  <img src="./assets/report.gif" width="700"/>
</p>

- Upload PDF/image  
- OCR + medical value extraction  
- Guideline-based classification (ADA, ACC/AHA, WHO)  
- Simple English explanations  

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

### 💬 Offline Medical Chatbot
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

**Default ASHA login:** `asha@healthmitra.local` / `Asha@123` (see `asha_credentials.txt`)

---

## 🔥 Why This Matters

- 🌍 Works in **low-connectivity areas**
- 🔒 Keeps **all data private**
- 🧠 Combines **clinical rules + optional local LLM**
- ⚡ Enables **early detection & intervention**

---

## 🧠 Tech Stack

### Frontend
- React 18 + Vite

### Backend
- FastAPI + SQLAlchemy + SQLite

### LLM (optional)
- Ollama (Phi-3 / Llama 3)

### Data Processing
- Tesseract OCR
- pdfplumber
- ChromaDB (RAG)

---

## 🧱 Architecture

```mermaid
flowchart TD
    A[Frontend] --> B[FastAPI Backend]
    B --> C[Clinical Engine]
    B --> D[OCR Engine]
    B --> E[LLM Layer]
    B --> F[SQLite DB]
```

---

## ⚡ Quick Start

```bat
git clone https://github.com/your-username/healthmitra-scan.git
cd healthmitra-scan
setup.bat
run.bat
```

## 🌐 Run Locally

| Service  | URL |
|----------|-----|
| Frontend | http://localhost:5173 |
| Backend  | http://localhost:8000 |
| API Docs | http://localhost:8000/docs |

**Default user login:** `user@gmail.com` / `12345` (see `user_credentials.txt`)

---

## 📸 Screenshots

<p align="center">
  <img src="./assets/dashboard.png" width="400"/>
  <img src="./assets/chatbot.png" width="400"/>
</p>

---

## 🏆 Impact

HealthMitra is designed for:

- 🏥 Rural clinics
- 👩‍⚕️ ASHA workers
- 📄 Patients with no medical knowledge
- 🌐 Areas with limited internet

---

## 🚧 Roadmap

- Mobile app
- Voice-based assistant
- More languages
- Edge optimization

---

## 👨‍💻 Team

Team: Core 4 Codeers

---

## ⭐ Support

If you like this project:

- ⭐ Star the repo
- 🔗 Share it
- 🚀 Build on it
