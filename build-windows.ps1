# Windows Build Script with Retry Logic
# Solves EBUSY file locking issues

$maxRetries = 3
$retryCount = 0
$success = $false

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PetBuddy Windows Build Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

while ($retryCount -lt $maxRetries -and -not $success) {
    $attempt = $retryCount + 1
    Write-Host "Build attempt $attempt of $maxRetries..." -ForegroundColor Yellow
    Write-Host ""
    
    # Clean old files
    if (Test-Path "dist\win-unpacked") {
        Write-Host "Cleaning old build files..." -ForegroundColor Gray
        Remove-Item -Path "dist\win-unpacked" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # Run build
    Write-Host "Starting build..." -ForegroundColor Green
    pnpm run package:win:x64
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "BUILD SUCCESSFUL!" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "Output files:" -ForegroundColor Cyan
        Write-Host "  - dist\PetBuddy-Setup-0.2.0.exe" -ForegroundColor White
        Write-Host "  - dist\win-unpacked\" -ForegroundColor White
        Write-Host ""
        $success = $true
        exit 0
    }
    
    $retryCount++
    
    if ($retryCount -lt $maxRetries) {
        Write-Host ""
        Write-Host "Build failed, waiting 10 seconds before retry..." -ForegroundColor Red
        Write-Host "Tip: Try temporarily disabling Windows Defender Real-time Protection" -ForegroundColor Yellow
        Write-Host ""
        Start-Sleep -Seconds 10
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "BUILD FAILED - Max retries reached" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "Try these solutions:" -ForegroundColor Yellow
    Write-Host "1. Temporarily disable Windows Defender Real-time Protection" -ForegroundColor White
    Write-Host "2. Add 'dist' folder to Windows Defender exclusions" -ForegroundColor White
    Write-Host "3. Close all File Explorer windows" -ForegroundColor White
    Write-Host "4. Run this script as Administrator" -ForegroundColor White
    Write-Host ""
    Write-Host "See: WINDOWS_PACKAGING_TROUBLESHOOTING.md for details" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
