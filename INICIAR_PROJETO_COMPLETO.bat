@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HydroAlert AI - Projeto completo
echo ========================================================
echo  HYDROALERT AI - Docker + MQTT + MongoDB + IA + Dashboard
echo ========================================================
where docker >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Docker nao encontrado.
  goto :erro
)
docker info >nul 2>&1
if errorlevel 1 (
  echo [ERRO] Inicie o Docker Desktop primeiro.
  goto :erro
)
echo [1/6] Subindo infraestrutura...
docker compose up -d --build mosquitto mongo subscriber api
if errorlevel 1 goto :erro
echo [2/6] Aguardando infraestrutura...
timeout /t 8 /nobreak >nul
echo [3/6] Gerando historico de teste, nao sao sensores reais...
docker compose run --rm publisher python -m iot.mqtt_publisher --ciclos 120 --intervalo 0.05 --passo-minutos 15 --seed 42
if errorlevel 1 goto :erro
echo [4/6] Aguardando escrita MQTT no MongoDB...
timeout /t 5 /nobreak >nul
echo [5/6] Treinando modelos de IA...
docker compose run --rm trainer
if errorlevel 1 goto :erro
echo [6/6] Ativando simulação continua...
docker compose --profile simulacao up -d publisher
if errorlevel 1 goto :erro
echo.
docker compose ps
echo.
echo Conferindo API e status do modelo:
powershell -NoProfile -Command "try { (Invoke-RestMethod http://localhost:8000/health -TimeoutSec 10).status } catch { Write-Host '[AVISO] API ainda nao responde:' $_.Exception.Message }"
powershell -NoProfile -Command "try { (Invoke-RestMethod http://localhost:8000/api/ml/status -TimeoutSec 10) | ConvertTo-Json -Depth 5 } catch { Write-Host '[AVISO] Consulte os logs da API:' $_.Exception.Message }"
echo.
echo Dashboard: http://localhost:8000
echo Telemetria: http://localhost:8000/api/telemetria
echo IA: http://localhost:8000/api/ml/status
echo.
echo Dados publicados nesta etapa sao SIMULADOS. O ESP32 real requer
echo configuracao Wi-Fi e gravacao pela Arduino IDE.
start "" "http://localhost:8000"
pause
exit /b 0
:erro
echo.
echo [ERRO] Etapa incompleta. Use: docker compose logs --tail=100
pause
exit /b 1
