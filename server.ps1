# SigFlow - Zero-Dependency Local Dev Server Entry Point
param (
    [int]$Port = 3000
)

$script = Join-Path $PSScriptRoot "start-server.ps1"
if (Test-Path $script) {
    & $script -Port $Port
} else {
    Write-Host "Could not locate start-server.ps1 in $PSScriptRoot" -ForegroundColor Red
}
