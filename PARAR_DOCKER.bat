@echo off
setlocal
cd /d "%~dp0"

echo Parando os containers do HydroAlert AI...
docker compose down

echo.
echo Ambiente Docker encerrado.
echo Os volumes de MongoDB, dados e modelos foram preservados.
echo.
echo Para apagar tambem os volumes, use manualmente:
echo docker compose down -v
pause
