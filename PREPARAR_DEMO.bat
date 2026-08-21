@echo off
setlocal
cd /d "%~dp0"

if not exist .venv\Scripts\python.exe (
    echo Ambiente virtual nao encontrado.
    echo Crie e instale as dependencias antes de continuar.
    pause
    exit /b 1
)

echo Gerando 30 horas hidrologicas simuladas...
.venv\Scripts\python.exe -m iot.sensor_simulator --ciclos 120 --intervalo 0 --passo-minutos 15 --seed 42
if errorlevel 1 goto erro

echo.
echo Treinando modelos de 1h, 3h e 6h...
.venv\Scripts\python.exe -m ml.train_model
if errorlevel 1 goto erro

echo.
echo Executando testes...
.venv\Scripts\python.exe -m unittest discover -s tests -v
if errorlevel 1 goto erro

echo.
echo Demo preparada com sucesso.
pause
exit /b 0

:erro
echo.
echo Ocorreu um erro durante a preparacao da demo.
pause
exit /b 1
