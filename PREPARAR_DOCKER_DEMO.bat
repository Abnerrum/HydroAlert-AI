@echo off
setlocal
cd /d "%~dp0"

echo =================================================
echo   HydroAlert AI - Preparar demonstracao Docker
echo =================================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao foi encontrado no PATH.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Abra o Docker Desktop e aguarde o Engine iniciar.
    pause
    exit /b 1
)

echo [1/5] Construindo e iniciando infraestrutura...
docker compose up -d --build mosquitto mongo subscriber api
if errorlevel 1 goto :erro

echo.
echo [2/5] Aguardando MongoDB, MQTT e subscriber...
timeout /t 8 /nobreak >nul

echo.
echo [3/5] Gerando 120 ciclos de telemetria simulada...
docker compose run --rm publisher python -m iot.mqtt_publisher --ciclos 120 --intervalo 0.05 --passo-minutos 15 --seed 42
if errorlevel 1 goto :erro

echo.
echo Aguardando o subscriber concluir a persistencia...
timeout /t 5 /nobreak >nul

echo.
echo [4/5] Treinando o modelo de Machine Learning...
docker compose run --rm trainer
if errorlevel 1 goto :erro

echo.
echo [5/5] Verificando os containers...
docker compose ps

echo.
echo =================================================
echo   Demonstracao preparada com sucesso
echo =================================================
echo Dashboard: http://localhost:8000
echo Swagger:   http://localhost:8000/docs
echo Health:    http://localhost:8000/health
echo.
echo Teste o status do modelo em:
echo http://localhost:8000/api/ml/status
echo.
pause
exit /b 0

:erro
echo.
echo [ERRO] A preparacao nao foi concluida.
echo Consulte os logs com:
echo docker compose logs --tail=100
pause
exit /b 1
