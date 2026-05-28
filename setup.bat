@echo off
setlocal EnableDelayedExpansion

cd /d "%~dp0"

set "NO_PAUSE=0"
set "SKIP_MODELS=0"
for %%A in (%*) do (
    if /I "%%~A"=="--no-pause" set "NO_PAUSE=1"
    if /I "%%~A"=="--skip-models" set "SKIP_MODELS=1"
)

echo ============================================
echo   HealthMitra Scan - One-Time Setup
echo ============================================
echo.

set "ROOT_DIR=%~dp0"
if "%ROOT_DIR:~-1%"=="\" set "ROOT_DIR=%ROOT_DIR:~0,-1%"
set "BACKEND_DIR=%ROOT_DIR%\backend"
set "FRONTEND_DIR=%ROOT_DIR%\frontend"
set "MODELS_DIR=%BACKEND_DIR%\models"
set "HF_HOME=%MODELS_DIR%\.hf-cache"
set "TRANSFORMERS_CACHE=%HF_HOME%\transformers"
set "HEALTHMITRA_REQUIRE_REAL_MODELS=1"

set "PYTHON_EXE=%ROOT_DIR%\venv\Scripts\python.exe"
set "EXISTING_VENV_OK=0"
if exist "%PYTHON_EXE%" (
    "%PYTHON_EXE%" -c "import sys; assert sys.version_info[:2] in [(3,10),(3,11),(3,12),(3,13)]" >nul 2>&1
    if not errorlevel 1 (
        set "EXISTING_VENV_OK=1"
        echo [OK] Reusing local Python venv.
    )
)

rem Prefer Python versions with reliable ML wheels on Windows when a venv must be created.
set "PY_CMD="
if "%EXISTING_VENV_OK%"=="0" (
for %%V in (3.13 3.12 3.11 3.10) do (
        if not defined PY_CMD (
            py -%%V -c "import sys" >nul 2>&1
            if not errorlevel 1 set "PY_CMD=py -%%V"
        )
    )
    if not defined PY_CMD (
        python --version >nul 2>&1
        if not errorlevel 1 (
            for /f %%I in ('python -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set "PY_VER=%%I"
            for %%V in (3.10 3.11 3.12 3.13) do (
                if "!PY_VER!"=="%%V" set "PY_CMD=python"
            )
        )
    )
    if not defined PY_CMD (
        echo [ERROR] Supported Python not found. Install Python 3.10, 3.11, 3.12, or 3.13.
        goto fail
    )
    for /f %%I in ('!PY_CMD! -c "import sys; print(f'{sys.version_info.major}.{sys.version_info.minor}')"') do set "PY_VER=%%I"
    echo [OK] Using Python !PY_VER! via "!PY_CMD!".
)

node --version >nul 2>&1
if errorlevel 1 (
    echo [ERROR] Node.js not found. Install Node.js 18+.
    goto fail
)
echo [OK] Node.js is installed.
echo.

echo [1/7] Preparing Python virtual environment...
set "RECREATE_VENV=0"
if exist "venv\Scripts\python.exe" (
    "venv\Scripts\python.exe" -c "import sys; assert sys.version_info[:2] in [(3,10),(3,11),(3,12),(3,13)]" >nul 2>&1
    if errorlevel 1 set "RECREATE_VENV=1"
)
if "!RECREATE_VENV!"=="1" (
    echo [SETUP] Existing venv is incompatible; recreating it.
    rmdir /s /q "venv"
)
if not exist "venv" (
    !PY_CMD! -m venv venv
    if errorlevel 1 (
        echo [ERROR] Virtual environment creation failed.
        goto fail
    )
)
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Virtual environment Python was not created.
    goto fail
)
echo [OK] Virtual environment ready.
echo.

echo [2/7] Syncing backend dependencies...
set "NEED_PIP_INSTALL=0"
if not exist "venv\.deps_installed" set "NEED_PIP_INSTALL=1"
if exist "venv\.deps_installed" (
    for %%I in ("requirements.txt") do set "REQ_TIME=%%~tI"
    for %%I in ("venv\.deps_installed") do set "VENV_TIME=%%~tI"
    if not "!REQ_TIME!"=="!VENV_TIME!" set "NEED_PIP_INSTALL=1"
)
if "!NEED_PIP_INSTALL!"=="1" (
    "%PYTHON_EXE%" -m pip install --upgrade pip
    if errorlevel 1 goto pip_fail
    "%PYTHON_EXE%" -m pip install -r requirements.txt
    if errorlevel 1 goto pip_fail
    copy /y "requirements.txt" "venv\.deps_installed" >nul
) else (
    echo [SKIP] Backend dependencies already up to date.
)
echo [OK] Backend dependencies ready.
echo.

echo [3/7] Syncing frontend dependencies...
if not exist "%FRONTEND_DIR%\package.json" (
    echo [ERROR] frontend\package.json not found.
    goto fail
)
pushd "%FRONTEND_DIR%"
set "NEED_NPM_INSTALL=0"
if not exist "node_modules" set "NEED_NPM_INSTALL=1"
if not exist ".deps_installed" set "NEED_NPM_INSTALL=1"
if exist ".deps_installed" (
    for %%I in ("package.json") do set "PKG_TIME=%%~tI"
    for %%I in (".deps_installed") do set "NPM_TIME=%%~tI"
    if not "!PKG_TIME!"=="!NPM_TIME!" set "NEED_NPM_INSTALL=1"
)
if "!NEED_NPM_INSTALL!"=="1" (
    call npm install
    if errorlevel 1 (
        popd
        echo [ERROR] npm install failed.
        goto fail
    )
    copy /y "package.json" ".deps_installed" >nul
) else (
    echo [SKIP] Frontend dependencies already up to date.
)
popd
echo [OK] Frontend dependencies ready.
echo.

echo [4/7] Preparing local model directories...
if not exist "%MODELS_DIR%" mkdir "%MODELS_DIR%"
if not exist "%BACKEND_DIR%\uploads" mkdir "%BACKEND_DIR%\uploads"
if not exist "%BACKEND_DIR%\uploads\profiles" mkdir "%BACKEND_DIR%\uploads\profiles"
if not exist "%MODELS_DIR%\yolov8-chest-xray" mkdir "%MODELS_DIR%\yolov8-chest-xray"
if not exist "%MODELS_DIR%\chexfract-maira2" mkdir "%MODELS_DIR%\chexfract-maira2"
if not exist "%MODELS_DIR%\yolov8-fracture" mkdir "%MODELS_DIR%\yolov8-fracture"
if not exist "%HF_HOME%" mkdir "%HF_HOME%"
"%PYTHON_EXE%" "%BACKEND_DIR%\scripts\download_models.py"
if errorlevel 1 echo [WARN] Universal fracture setup helper failed; continuing with existing X-ray setup.
echo [OK] Local model storage: %MODELS_DIR%
echo.

echo [5/7] Installing X-ray AI models locally...
if "%SKIP_MODELS%"=="1" (
    echo [WARN] --skip-models supplied. X-ray analysis will not be marked setup-complete.
    goto model_check
)

if not exist "%MODELS_DIR%\yolov8-chest-xray\best.pt" (
    echo [MODEL 1/3] Downloading pneumonia model...
    "%PYTHON_EXE%" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='keremberke/yolov8m-chest-xray-classification', local_dir=r'%MODELS_DIR%\yolov8-chest-xray', repo_type='model', ignore_patterns=['*.md','*.txt'])"
    if errorlevel 1 goto model_fail
) else (
    echo [MODEL 1/3] Pneumonia model already present.
)

if not exist "%MODELS_DIR%\yolov8-fracture\best.pt" (
    echo [MODEL 2/3] Downloading fracture YOLO fallback model...
    "%PYTHON_EXE%" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='adeebaai/bone-fracture-yolov8', local_dir=r'%MODELS_DIR%\yolov8-fracture', repo_type='model', ignore_patterns=['*.md','*.txt'])"
    if errorlevel 1 goto model_fail
) else (
    echo [MODEL 2/3] Fracture YOLO model already present.
)

if not exist "%MODELS_DIR%\chexfract-maira2\config.json" (
    echo [MODEL 3/3] Downloading ChexFract MAIRA-2 model. This is large.
    "%PYTHON_EXE%" -c "from huggingface_hub import snapshot_download; snapshot_download(repo_id='AIRI-Institute/chexfract-maira2', local_dir=r'%MODELS_DIR%\chexfract-maira2', repo_type='model')"
    if errorlevel 1 goto model_fail
) else (
    echo [MODEL 3/3] ChexFract model already present.
)

:model_check
if not exist "%MODELS_DIR%\yolov8-chest-xray\best.pt" (
    echo [ERROR] Missing required model: %MODELS_DIR%\yolov8-chest-xray\best.pt
    goto fail
)
if not exist "%MODELS_DIR%\yolov8-fracture\best.pt" (
    echo [ERROR] Missing required model: %MODELS_DIR%\yolov8-fracture\best.pt
    goto fail
)
if not exist "%MODELS_DIR%\chexfract-maira2\config.json" (
    echo [ERROR] Missing required model: %MODELS_DIR%\chexfract-maira2\config.json
    goto fail
)
echo [OK] X-ray AI models are installed locally.
echo.

echo [6/7] Checking optional local tools...
where tesseract >nul 2>&1
if errorlevel 1 (
    echo [WARN] Tesseract OCR not found in PATH. OCR still runs for structured PDFs, but scanned images need Tesseract.
) else (
    echo [OK] Tesseract OCR found.
)
where ffmpeg >nul 2>&1
if errorlevel 1 (
    echo [WARN] ffmpeg not found in PATH. Voice features may be limited.
) else (
    echo [OK] ffmpeg found.
)
echo.

echo [7/7] Verifying backend imports and frontend build...
pushd "%BACKEND_DIR%"
"%PYTHON_EXE%" -c "import main; print('backend import ok')"
if errorlevel 1 (
    popd
    echo [ERROR] Backend import check failed.
    goto fail
)
popd

pushd "%FRONTEND_DIR%"
call npm run build
if errorlevel 1 (
    popd
    echo [ERROR] Frontend build failed.
    goto fail
)
popd
echo [OK] Verification complete.
echo.

echo Setup successfully completed on %DATE% %TIME% > "venv\.setup_finished"
echo ============================================
echo   Setup Complete
echo ============================================
echo Second and later boots use run.bat fast mode.
if "%NO_PAUSE%"=="0" pause
exit /b 0

:pip_fail
echo [ERROR] Python dependency installation failed.
goto fail

:model_fail
echo [ERROR] Model download failed. Check internet access and retry setup.bat.
goto fail

:fail
if exist "venv\.setup_finished" del /q "venv\.setup_finished" >nul 2>&1
echo.
echo [FAILED] Setup did not complete. Fix the error above and rerun setup.bat.
if "%NO_PAUSE%"=="0" pause
exit /b 1
