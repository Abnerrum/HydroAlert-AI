@echo off
setlocal

if not exist .venv\Scripts\python.exe (
    echo Ambiente virtual nao encontrado.
    echo Crie com: python -m venv .venv
    pause
    exit /b 1
)

.venv\Scripts\python.exe -m iot.mqtt_subscriber
pause
