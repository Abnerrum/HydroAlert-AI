@echo off
setlocal
cd /d "%~dp0"
title HydroAlert AI - Instalacao
powershell -NoProfile -ExecutionPolicy Bypass -File "%~dp0scripts\instalar_windows.ps1"
set "RESULTADO=%ERRORLEVEL%"
echo.
if not "%RESULTADO%"=="0" echo A instalacao nao terminou. Veja o erro acima e execute novamente.
pause
exit /b %RESULTADO%
