@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
title HealthMitra Scan Runner

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "VENV_PYTHON=%ROOT_DIR%\venv\Scripts\python.exe"
set "MODELS_DIR=%BACKEND_DIR%\models"
set "HF_HOME=%MODELS_DIR%\.hf-cache"
set "TRANSFORMERS_CACHE=%HF_HOME%\transformers"
set "HEALTHMITRA_REQUIRE_REAL_MODELS=1"

set "FORCE_SETUP=0"
if /I "%~1"=="--setup" set "FORCE_SETUP=1"
if /I "%~1"=="--force-setup" set "FORCE_SETUP=1"

if "%FORCE_SETUP%"=="1" (
    echo [INFO] Force setup requested.
    call setup.bat --no-pause
    if errorlevel 1 exit /b 1
)

if not exist "venv\.setup_finished" (
    echo =======================================================
    echo   HealthMitra Scan - Initial Setup Required
    echo =======================================================
    echo [INFO] Running one-time setup. Later boots skip setup automatically.
    call setup.bat --no-pause
    if errorlevel 1 (
        echo [ERROR] Setup failed. Please resolve setup errors first.
        pause
        exit /b 1
    )
)

if not exist "%VENV_PYTHON%" (
    echo [ERROR] Python virtual environment is missing. Run setup.bat.
    pause
    exit /b 1
)
if not exist "%MODELS_DIR%\yolov8-chest-xray\best.pt" (
    echo [ERROR] Pneumonia model is missing. Run setup.bat.
    pause
    exit /b 1
)
if not exist "%MODELS_DIR%\yolov8-fracture\best.pt" (
    echo [ERROR] Fracture YOLO model is missing. Run setup.bat.
    pause
    exit /b 1
)
if not exist "%MODELS_DIR%\chexfract-maira2\config.json" (
    echo [ERROR] ChexFract model is missing. Run setup.bat.
    pause
    exit /b 1
)

echo =======================================================
echo   HealthMitra Scan - Fast Boot
echo =======================================================
echo [INFO] Setup sentinel and local models found. Starting servers...
echo.

echo [1/3] Closing stale tasks on ports 8000 and 5173...
for %%p in (8000 5173) do (
    for /f "tokens=5" %%a in ('netstat -aon ^| findstr /c:"LISTENING" ^| findstr ":%%p" 2^>nul') do (
        if not "%%a"=="" taskkill /F /PID %%a >nul 2>&1
    )
)
echo [OK] Port cleanup complete.

echo [2/3] Loading backend environment...
if exist "backend\.env" (
    for /f "usebackq eol=# tokens=1,* delims==" %%A in ("backend\.env") do (
        if not "%%A"=="" set "%%A=%%B"
    )
    echo [OK] backend\.env loaded.
) else (
    echo [SKIP] backend\.env not found.
)

echo [3/3] Launching backend and frontend...
start "HealthMitra Backend" /D "%BACKEND_DIR%" cmd /k "title HealthMitra Backend && ..\venv\Scripts\python.exe main.py"
timeout /t 1 /nobreak >nul
start "HealthMitra Frontend" /D "%FRONTEND_DIR%" cmd /k "title HealthMitra Frontend && npm.cmd run dev"

echo.
echo =======================================================
echo   HealthMitra Scan is running
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo   X-Ray:    http://localhost:8000/api/xray-agent/status
echo =======================================================
echo.
timeout /t 2 /nobreak >nul
exit /b 0
