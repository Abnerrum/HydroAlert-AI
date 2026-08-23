@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title HydroAlert AI - Inicializacao automatica

set "DASHBOARD=http://127.0.0.1:8000"
set "DOCKER_DESKTOP=C:\Program Files\Docker\Docker\Docker Desktop.exe"

echo =====================================================
echo   HydroAlert AI - inicializacao automatica
echo =====================================================
echo.

where docker >nul 2>&1
if errorlevel 1 goto docker_nao_encontrado

docker info >nul 2>&1
if not errorlevel 1 goto docker_ok

echo Iniciando Docker Desktop automaticamente...
if exist "%DOCKER_DESKTOP%" start "" "%DOCKER_DESKTOP%"
set /a TENTATIVA=0

:aguardar_docker
timeout /t 3 /nobreak >nul
docker info >nul 2>&1
if not errorlevel 1 goto docker_ok
set /a TENTATIVA+=1
if %TENTATIVA% GEQ 30 goto docker_timeout
goto aguardar_docker

:docker_ok
if exist ".git" (
    echo Verificando atualizacoes do projeto...
    git pull --ff-only >nul 2>&1
)

echo Preparando os servicos. Na primeira execucao pode levar alguns minutos...
docker compose up -d --build
if errorlevel 1 goto compose_erro

echo Aguardando a API ficar pronta...
set /a TENTATIVA=0

:aguardar_api
curl -fsS "%DASHBOARD%/health" >nul 2>&1
if not errorlevel 1 goto api_ok
timeout /t 2 /nobreak >nul
set /a TENTATIVA+=1
if %TENTATIVA% GEQ 45 goto api_timeout
goto aguardar_api

:api_ok
powershell -NoProfile -ExecutionPolicy Bypass -Command "$desktop=[Environment]::GetFolderPath('Desktop'); $atalho=Join-Path $desktop 'HydroAlert AI.lnk'; if(-not (Test-Path $atalho)){ $w=New-Object -ComObject WScript.Shell; $s=$w.CreateShortcut($atalho); $s.TargetPath='%~f0'; $s.WorkingDirectory='%~dp0'; $s.Description='Iniciar HydroAlert AI automaticamente'; $s.Save() }" >nul 2>&1

echo.
echo HydroAlert AI esta online neste computador.
echo Abrindo: %DASHBOARD%
start "" "%DASHBOARD%"
timeout /t 2 /nobreak >nul
exit /b 0

:docker_nao_encontrado
echo Docker Desktop nao foi encontrado neste computador.
echo Instale o Docker Desktop uma unica vez para usar o modo automatico.
pause
exit /b 1

:docker_timeout
echo Nao foi possivel iniciar o Docker Desktop automaticamente.
pause
exit /b 1

:compose_erro
echo.
echo O Docker nao conseguiu iniciar o HydroAlert.
echo Execute novamente este arquivo para tentar outra vez.
pause
exit /b 1

:api_timeout
echo A API demorou mais que o esperado para iniciar.
echo Verifique o Docker Desktop e tente novamente.
pause
exit /b 1
