@echo off
echo ==========================================================
echo  Starting Kissanmart (Unified Hostable Package)
echo ==========================================================

if not exist "frontend\dist\index.html" (
    echo [1/2] Building React frontend...
    call npm --prefix frontend install
    call npm --prefix frontend run build
) else (
    echo [1/2] Frontend bundle verified.
)

set PORT=%PORT%
if "%PORT%"=="" set PORT=8000

echo [2/2] Launching unified FastAPI server on http://localhost:%PORT%
echo   - App Portal: http://localhost:%PORT%/
echo   - API Docs:   http://localhost:%PORT%/docs
echo   - Health:     http://localhost:%PORT%/api/v1/health
echo.

python -m uvicorn app.main:app --app-dir backend --host 0.0.0.0 --port %PORT%

