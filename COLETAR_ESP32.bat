@echo off
setlocal
cd /d "%~dp0"
if not exist ".venv\Scripts\python.exe" (
    echo Execute INSTALAR_TUDO.bat primeiro.
    pause
    exit /b 1
)
".venv\Scripts\python.exe" scripts\coletar_usb.py
set "RESULTADO=%ERRORLEVEL%"
pause
exit /b %RESULTADO%
