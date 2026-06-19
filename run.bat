@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"
title HealthMitra Scan Runner

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "LOCAL_DIR=%ROOT_DIR%\.local"
set "VENV_PYTHON=%LOCAL_DIR%\python\tools\python.exe"
set "NPM_CMD=%LOCAL_DIR%\node\node-v20.14.0-win-x64\npm.cmd"
set "PATH=%LOCAL_DIR%\node\node-v20.14.0-win-x64;%PATH%"
set "MODELS_DIR=%BACKEND_DIR%\models"
set "HEALTHMITRA_REQUIRE_REAL_MODELS=1"

set "FORCE_SETUP=0"
if /I "%~1"=="--setup" set "FORCE_SETUP=1"
if /I "%~1"=="--force-setup" set "FORCE_SETUP=1"

if "%FORCE_SETUP%"=="1" (
    echo [INFO] Force setup requested.
    call setup.bat --no-pause
    if errorlevel 1 exit /b 1
)

if not exist "%LOCAL_DIR%\.setup_finished" (
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

echo [2b/3] Initializing Tesseract OCR...
set "TESSERACT_EXE=C:\Program Files\Tesseract-OCR\tesseract.exe"
if exist "%TESSERACT_EXE%" (
    set "TESSERACT_CMD=%TESSERACT_EXE%"
    set "PATH=C:\Program Files\Tesseract-OCR;%PATH%"
    echo [OK] Tesseract ready: %TESSERACT_EXE%
) else (
    where tesseract >nul 2>&1
    if not errorlevel 1 (
        echo [OK] Tesseract found on PATH.
    ) else (
        echo [WARN] Tesseract not found. Run setup.bat to install OCR support.
    )
)

echo [3/3] Launching backend and frontend...
start "HealthMitra Backend" /D "%BACKEND_DIR%" cmd /k "set PYTHON_EXE=%VENV_PYTHON%&& call start_server.bat"
timeout /t 2 /nobreak >nul
start "HealthMitra Frontend" /D "%FRONTEND_DIR%" cmd /k "title HealthMitra Frontend && "%NPM_CMD%" run dev"

echo.
echo =======================================================
echo   HealthMitra Scan is running
echo   Backend:  http://localhost:8000
echo   Frontend: http://localhost:5173
echo =======================================================
echo.
timeout /t 2 /nobreak >nul
exit /b 0
