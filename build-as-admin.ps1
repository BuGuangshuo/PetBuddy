# Check if running as administrator
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "This script needs to run as Administrator to properly clean locked files." -ForegroundColor Yellow
    Write-Host "Restarting with elevated privileges..." -ForegroundColor Cyan
    
    # Restart script with admin privileges
    Start-Process powershell.exe -ArgumentList "-NoProfile -ExecutionPolicy Bypass -File `"$PSCommandPath`"" -Verb RunAs
    exit
}

Write-Host "========================================" -ForegroundColor Green
Write-Host "Running as Administrator" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Green
Write-Host ""

# Stop Windows Defender temporarily
Write-Host "Temporarily disabling Windows Defender Real-time Protection..." -ForegroundColor Yellow
try {
    Set-MpPreference -DisableRealtimeMonitoring $true -ErrorAction Stop
    Write-Host "Real-time Protection disabled" -ForegroundColor Green
} catch {
    Write-Host "Could not disable Real-time Protection: $_" -ForegroundColor Red
    Write-Host "Continuing anyway..." -ForegroundColor Yellow
}

Start-Sleep -Seconds 2

# Clean dist directory
Write-Host ""
Write-Host "Cleaning dist directory..." -ForegroundColor Yellow
if (Test-Path "dist") {
    Remove-Item -Path "dist" -Recurse -Force -ErrorAction SilentlyContinue
    Start-Sleep -Seconds 3
}

# Build
Write-Host ""
Write-Host "Starting build..." -ForegroundColor Cyan
Write-Host ""

Set-Location $PSScriptRoot
pnpm run package:win:x64

$buildSuccess = $LASTEXITCODE -eq 0

# Re-enable Windows Defender
Write-Host ""
Write-Host "Re-enabling Windows Defender Real-time Protection..." -ForegroundColor Yellow
try {
    Set-MpPreference -DisableRealtimeMonitoring $false -ErrorAction Stop
    Write-Host "Real-time Protection re-enabled" -ForegroundColor Green
} catch {
    Write-Host "Could not re-enable Real-time Protection: $_" -ForegroundColor Red
}

Write-Host ""
if ($buildSuccess) {
    Write-Host "========================================" -ForegroundColor Green
    Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
    Write-Host "========================================" -ForegroundColor Green
} else {
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
}

Write-Host ""
Write-Host "Press any key to exit..."
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
