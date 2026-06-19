@echo off
setlocal EnableDelayedExpansion
cd /d "%~dp0"

if not defined PYTHON_EXE (
    set "PYTHON_EXE=%~dp0..\.local\python\tools\python.exe"
)

if exist "C:\Program Files\Tesseract-OCR\tesseract.exe" (
    set "PATH=C:\Program Files\Tesseract-OCR;!PATH!"
    set "TESSERACT_CMD=C:\Program Files\Tesseract-OCR\tesseract.exe"
)

if exist ".env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in (".env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
)

title HealthMitra Backend
echo [HealthMitra] Starting backend on http://localhost:8000 ...
"%PYTHON_EXE%" main.py
if errorlevel 1 (
    echo.
    echo [ERROR] Backend exited with an error. See messages above.
    pause
)
