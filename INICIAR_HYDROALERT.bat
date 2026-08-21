@echo off
setlocal
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo =====================================================
    echo HydroAlert AI v2 - ambiente virtual nao encontrado
    echo =====================================================
    echo.
    echo Execute primeiro:
    echo   python -m venv .venv
    echo   .\.venv\Scripts\activate
    echo   python -m pip install -r requirements.txt
    echo.
    pause
    exit /b 1
)

echo =====================================================
echo HydroAlert AI v2 - iniciando Centro de Operacoes
echo =====================================================
echo Dashboard: http://127.0.0.1:8000
echo Swagger:   http://127.0.0.1:8000/docs
echo.

start "" cmd /c "timeout /t 2 /nobreak >nul & start http://127.0.0.1:8000"
.venv\Scripts\python.exe -m uvicorn api.main:app --host 127.0.0.1 --port 8000 --reload
