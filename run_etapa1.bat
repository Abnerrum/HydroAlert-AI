@echo off
setlocal
cd /d "%~dp0"

echo ================================================
echo HydroAlert AI - Etapa 1

echo Executando 10 ciclos do simulador IoT...
echo ================================================

python -m iot.sensor_simulator --ciclos 10

if errorlevel 1 (
    echo.
    echo Ocorreu um erro. Verifique se o Python esta instalado e disponivel no PATH.
)

echo.
pause
