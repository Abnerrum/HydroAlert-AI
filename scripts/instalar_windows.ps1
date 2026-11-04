$ErrorActionPreference = 'Stop'
Set-Location (Split-Path $PSScriptRoot -Parent)
function Find-Python {
    $candidates = @(
        (Join-Path $env:LOCALAPPDATA 'Programs\Python\Python312\python.exe'),
        (Join-Path $env:ProgramFiles 'Python312\python.exe')
    )
    foreach ($candidate in $candidates) {
        if (Test-Path $candidate) { return $candidate }
    }
    $launcher = Get-Command py -ErrorAction SilentlyContinue
    if ($launcher) {
        $found = & $launcher.Source -3.12 -c 'import sys; print(sys.executable)' 2>$null
        if ($LASTEXITCODE -eq 0 -and $found) { return ($found | Select-Object -Last 1) }
    }
    return $null
}
try {
    $pythonExe = Find-Python
    if (-not $pythonExe) {
        if (-not (Get-Command winget -ErrorAction SilentlyContinue)) {
            throw 'Instale Python 3.12 em https://www.python.org/downloads/windows/ ou atualize o Instalador de Aplicativo da Microsoft Store e tente novamente.'
        }
        Write-Host 'Instalando Python 3.12 para este usuario...'
        & winget install --id Python.Python.3.12 --exact --source winget --scope user --accept-source-agreements --accept-package-agreements
        if ($LASTEXITCODE -ne 0) { throw 'Falha ao instalar Python pelo winget.' }
        $pythonExe = Find-Python
    }
    if (-not $pythonExe) { throw 'Python 3.12 nao localizado. Reabra este instalador apos concluir a instalacao do Python.' }
    & $pythonExe scripts\instalar_projeto.py
    exit $LASTEXITCODE
} catch {
    Write-Host $_.Exception.Message -ForegroundColor Red
    exit 1
}
