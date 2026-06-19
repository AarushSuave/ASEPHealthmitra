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
set "HEALTHMITRA_REQUIRE_REAL_MODELS=1"

set "LOCAL_DIR=%ROOT_DIR%\.local"
if not exist "%LOCAL_DIR%" mkdir "%LOCAL_DIR%"

set "PYTHON_DIR=%LOCAL_DIR%\python"
set "PYTHON_EXE=%PYTHON_DIR%\tools\python.exe"

if not exist "%PYTHON_EXE%" (
    echo [SETUP] Downloading portable Python 3.11...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://www.nuget.org/api/v2/package/python/3.11.9' -OutFile '%LOCAL_DIR%\python.zip'"
    if errorlevel 1 goto fail
    echo [SETUP] Extracting portable Python...
    powershell -Command "Expand-Archive -Path '%LOCAL_DIR%\python.zip' -DestinationPath '%PYTHON_DIR%' -Force"
    if errorlevel 1 goto fail
    del /q "%LOCAL_DIR%\python.zip" >nul 2>&1
)
echo [OK] Using portable Python via "%PYTHON_EXE%".

set "NODE_DIR=%LOCAL_DIR%\node"
set "NODE_EXE=%NODE_DIR%\node-v20.14.0-win-x64\node.exe"
set "NPM_CMD=%NODE_DIR%\node-v20.14.0-win-x64\npm.cmd"

if not exist "%NODE_EXE%" (
    echo [SETUP] Downloading portable Node.js 20...
    powershell -Command "$ProgressPreference = 'SilentlyContinue'; Invoke-WebRequest -Uri 'https://nodejs.org/dist/v20.14.0/node-v20.14.0-win-x64.zip' -OutFile '%LOCAL_DIR%\node.zip'"
    if errorlevel 1 goto fail
    echo [SETUP] Extracting portable Node.js...
    powershell -Command "Expand-Archive -Path '%LOCAL_DIR%\node.zip' -DestinationPath '%NODE_DIR%' -Force"
    if errorlevel 1 goto fail
    del /q "%LOCAL_DIR%\node.zip" >nul 2>&1
)
echo [OK] Using portable Node.js via "%NODE_EXE%".
set "PATH=%NODE_DIR%\node-v20.14.0-win-x64;%PATH%"
echo.

echo [1/7] Preparing Python environment...
if not exist "%PYTHON_EXE%" (
    echo [ERROR] Portable Python was not found.
    goto fail
)
echo [OK] Python environment ready.
echo.

echo [2/7] Syncing backend dependencies...
set "NEED_PIP_INSTALL=0"
if not exist "%PYTHON_DIR%\.deps_installed" set "NEED_PIP_INSTALL=1"
if exist "%PYTHON_DIR%\.deps_installed" (
    for %%I in ("requirements.txt") do set "REQ_TIME=%%~tI"
    for %%I in ("%PYTHON_DIR%\.deps_installed") do set "VENV_TIME=%%~tI"
    if not "!REQ_TIME!"=="!VENV_TIME!" set "NEED_PIP_INSTALL=1"
)
if "!NEED_PIP_INSTALL!"=="1" (
    "%PYTHON_EXE%" -m pip install --upgrade pip --no-cache-dir
    if errorlevel 1 goto pip_fail
    "%PYTHON_EXE%" -m pip install --no-cache-dir -r requirements.txt
    if errorlevel 1 goto pip_fail
    copy /y "requirements.txt" "%PYTHON_DIR%\.deps_installed" >nul
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
    call "%NPM_CMD%" install --cache "%LOCAL_DIR%\npm-cache"
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
echo [OK] Local model storage: %MODELS_DIR%
echo.

echo [5/7] X-ray AI models removed.
echo.

echo [6/7] Checking optional local tools...
where tesseract >nul 2>&1
if errorlevel 1 (
    echo [INFO] Tesseract OCR not found. Report Scanner needs it for scanned images.
    echo [INFO] Install command ^(downloads on this device only, not stored in the repo^):
    echo   winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements
    where winget >nul 2>&1
    if not errorlevel 1 (
        echo [SETUP] Running winget Tesseract install...
        winget install --id UB-Mannheim.TesseractOCR -e --accept-package-agreements --accept-source-agreements
        if errorlevel 1 (
            echo [WARN] winget install failed. Run the command above manually as Administrator.
        ) else (
            echo [OK] Tesseract install finished. Restart the terminal if OCR still fails.
        )
    ) else (
        echo [WARN] winget not available. Install Tesseract manually or add tesseract.exe to PATH.
    )
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
call "%NPM_CMD%" run build
if errorlevel 1 (
    popd
    echo [ERROR] Frontend build failed.
    goto fail
)
popd
echo [OK] Verification complete.
echo.

echo Setup successfully completed on %DATE% %TIME% > "%LOCAL_DIR%\.setup_finished"
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
if exist "%LOCAL_DIR%\.setup_finished" del /q "%LOCAL_DIR%\.setup_finished" >nul 2>&1
echo.
echo [FAILED] Setup did not complete. Fix the error above and rerun setup.bat.
if "%NO_PAUSE%"=="0" pause
exit /b 1
