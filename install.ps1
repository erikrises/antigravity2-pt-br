<#
.SYNOPSIS
    Instalador da Tradução Português do Brasil (pt-BR) para Google Antigravity 2.0 no Windows.

.DESCRIPTION
    Aplica a tradução pt-BR injetando o motor de localização no arquivo app.asar do Antigravity.
    Suporta execução local ou remota (one-liner via irm | iex).
    Cria automaticamente um backup (app.asar.bak) na primeira execução.

.PARAMETER Restore
    Restaura o backup original oficial do Antigravity.

.PARAMETER Uninstall
    Sinônimo de -Restore.

.PARAMETER Kill
    Encerra automaticamente processos ativos do Antigravity antes de aplicar o patch.

.PARAMETER InstallDir
    Especifica manualmente o diretório de instalação do Antigravity.

.EXAMPLE
    .\install.ps1
    .\install.ps1 -Kill
    .\install.ps1 -Restore
    irm https://raw.githubusercontent.com/erikrises/antigravity2-pt-br/main/install.ps1 | iex
#>

[CmdletBinding()]
param (
    [switch]$Restore,
    [switch]$Uninstall,
    [switch]$Kill,
    [string]$InstallDir = ""
)

$ErrorActionPreference = "Stop"

Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host "  Antigravity 2.0 - Tradução em Português do Brasil (pt-BR) " -ForegroundColor Cyan
Write-Host "==========================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Verificar privilégios de Administrador
$isAdmin = ([Security.Principal.WindowsPrincipal][Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)
if (-not $isAdmin) {
    Write-Host "[AVISO] Recomendamos executar este script como Administrador para garantir permissão de escrita em Program Files / AppData." -ForegroundColor Yellow
    Write-Host "Caso encontre erro de permissão (EACCES/EPERM), abra o PowerShell como Administrador e execute novamente." -ForegroundColor Yellow
    Write-Host ""
}

# 2. Verificar instalação do Node.js
try {
    $nodeVersion = node -v
    Write-Host "[OK] Node.js detectado: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERRO] Node.js não foi encontrado no PATH do sistema!" -ForegroundColor Red
    Write-Host "Por favor, instale o Node.js v18 ou superior antes de prosseguir:" -ForegroundColor Yellow
    Write-Host "  - Via winget: winget install OpenJS.NodeJS.LTS" -ForegroundColor White
    Write-Host "  - Ou baixe em: https://nodejs.org/" -ForegroundColor White
    Exit 1
}

# 3. Verificar processos do Antigravity
$antigravityProcesses = Get-Process -Name "antigravity" -ErrorAction SilentlyContinue
if ($antigravityProcesses) {
    if ($Kill) {
        Write-Host "[INFO] Encerrando instâncias em execução do Antigravity..." -ForegroundColor Yellow
        Stop-Process -Name "antigravity" -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 1
    } else {
        Write-Host "[AVISO] O Antigravity parece estar em execução." -ForegroundColor Yellow
        Write-Host "No Windows, arquivos abertos ficam bloqueados pelo sistema." -ForegroundColor Yellow
        Write-Host "Feche o Antigravity antes de continuar, ou use: .\install.ps1 -Kill" -ForegroundColor Yellow
        Write-Host ""
    }
}

# 4. Determinar se execução é local ou remota (one-liner via irm | iex)
$cleanup = $false
$tempExtract = $null
$scriptDir = ""

if ($PSScriptRoot -and (Test-Path (Join-Path $PSScriptRoot "localization_engine.js"))) {
    $scriptDir = $PSScriptRoot
} elseif ($MyInvocation.MyCommand.Path -and (Test-Path (Join-Path (Split-Path -Parent $MyInvocation.MyCommand.Path) "localization_engine.js"))) {
    $scriptDir = Split-Path -Parent $MyInvocation.MyCommand.Path
} else {
    Write-Host "[INFO] Baixando a versão mais recente da tradução..." -ForegroundColor Cyan
    $tempZip = Join-Path $env:TEMP "antigravity-ptbr.zip"
    $tempExtract = Join-Path $env:TEMP "antigravity-ptbr-temp"
    if (Test-Path $tempExtract) { Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue }

    Invoke-WebRequest -Uri "https://github.com/erikrises/antigravity2-pt-br/archive/refs/heads/main.zip" -OutFile $tempZip -UseBasicParsing
    Expand-Archive -Path $tempZip -DestinationPath $tempExtract -Force
    Remove-Item -Force $tempZip

    $scriptDir = Join-Path $tempExtract "antigravity2-pt-br-main"
    $cleanup = $true
}

$engineScript = Join-Path $scriptDir "localization_engine.js"
if (-not (Test-Path $engineScript)) {
    Write-Host "[ERRO] Não foi possível localizar localization_engine.js em $scriptDir" -ForegroundColor Red
    Exit 1
}

# 5. Montar argumentos para o motor
$nodeArgs = @()
if ($Restore -or $Uninstall) {
    $nodeArgs += "--restore"
}
if ($Kill) {
    $nodeArgs += "--kill"
}
if ($InstallDir -ne "") {
    $nodeArgs += "--install-dir"
    $nodeArgs += $InstallDir
}

# 6. Executar o motor de localização
Write-Host "[INFO] Executando motor de localização..." -ForegroundColor Cyan
Push-Location $scriptDir
try {
    node localization_engine.js @nodeArgs
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        if ($Restore -or $Uninstall) {
            Write-Host ">> Restauração concluída com sucesso! << " -ForegroundColor Green
        } else {
            Write-Host ">> Tradução aplicada com sucesso! Reinicie o Antigravity para visualizar. << " -ForegroundColor Green
        }
    } else {
        Write-Host ""
        Write-Host "[ERRO] A operação falhou com código de saída $LASTEXITCODE." -ForegroundColor Red
        Exit $LASTEXITCODE
    }
} finally {
    Pop-Location
    if ($cleanup -and $tempExtract -and (Test-Path $tempExtract)) {
        Remove-Item -Recurse -Force $tempExtract -ErrorAction SilentlyContinue
    }
}
