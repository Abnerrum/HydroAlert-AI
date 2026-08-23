@echo off
setlocal
cd /d "%~dp0"

echo =============================================
echo   HydroAlert AI - Inicializacao com Docker
echo =============================================
echo.

where docker >nul 2>&1
if errorlevel 1 (
    echo [ERRO] Docker nao foi encontrado no PATH.
    echo Abra o Docker Desktop e tente novamente.
    pause
    exit /b 1
)

docker info >nul 2>&1
if errorlevel 1 (
    echo [ERRO] O Docker Desktop nao esta em execucao.
    echo Abra o Docker Desktop, aguarde o Engine iniciar e execute este arquivo novamente.
    pause
    exit /b 1
)

echo [1/3] Construindo e iniciando os containers...
docker compose up -d --build mosquitto mongo subscriber api
if errorlevel 1 goto :erro

echo.
echo [2/3] Aguardando os servicos ficarem prontos...
timeout /t 8 /nobreak >nul

echo.
echo [3/3] Status dos containers:
docker compose ps

echo.
echo =============================================
echo   HydroAlert AI iniciado
echo =============================================
echo Dashboard: http://localhost:8000
echo Swagger:   http://localhost:8000/docs
echo Health:    http://localhost:8000/health
echo MongoDB:   localhost:27017
echo MQTT:      localhost:1883
echo.
echo Para acompanhar os logs:
echo docker compose logs -f api subscriber

echo.
pause
exit /b 0

:erro
echo.
echo [ERRO] Nao foi possivel iniciar o ambiente Docker.
echo Execute: docker compose logs
pause
exit /b 1
