# Windows Build Check Script

Write-Host "Checking Windows build configuration..." -ForegroundColor Cyan
Write-Host ""

# Check required files
Write-Host "Checking required files..." -ForegroundColor Yellow
$filesOk = $true

if (-not (Test-Path "build/icon.png")) {
    Write-Host "[X] build/icon.png not found" -ForegroundColor Red
    $filesOk = $false
} else {
    Write-Host "[OK] build/icon.png exists" -ForegroundColor Green
}

if (-not (Test-Path "build/icon.ico")) {
    Write-Host "[!] build/icon.ico not found (needs to be generated)" -ForegroundColor Yellow
    Write-Host "    See: scripts/generate-windows-icon.md" -ForegroundColor Gray
    $filesOk = $false
} else {
    Write-Host "[OK] build/icon.ico exists" -ForegroundColor Green
}

if (-not (Test-Path "package.json")) {
    Write-Host "[X] package.json not found" -ForegroundColor Red
    $filesOk = $false
} else {
    Write-Host "[OK] package.json exists" -ForegroundColor Green
}

Write-Host ""

# Check package.json configuration
Write-Host "Checking package.json configuration..." -ForegroundColor Yellow
$configOk = $true

$packageJson = Get-Content "package.json" -Raw

if ($packageJson -notmatch '"package:win"') {
    Write-Host "[X] package.json missing package:win script" -ForegroundColor Red
    $configOk = $false
} else {
    Write-Host "[OK] package:win script configured" -ForegroundColor Green
}

if ($packageJson -notmatch '"win":') {
    Write-Host "[X] package.json missing win build config" -ForegroundColor Red
    $configOk = $false
} else {
    Write-Host "[OK] win build config added" -ForegroundColor Green
}

if ($packageJson -notmatch '"nsis":') {
    Write-Host "[X] package.json missing nsis config" -ForegroundColor Red
    $configOk = $false
} else {
    Write-Host "[OK] nsis config added" -ForegroundColor Green
}

Write-Host ""

# Check dependencies
Write-Host "Checking dependencies..." -ForegroundColor Yellow
$depsOk = $true

if (-not (Test-Path "node_modules")) {
    Write-Host "[!] node_modules not found, run: pnpm install" -ForegroundColor Yellow
    $depsOk = $false
} else {
    Write-Host "[OK] node_modules exists" -ForegroundColor Green
}

if (-not (Test-Path "node_modules/electron-builder/package.json")) {
    Write-Host "[X] electron-builder not installed" -ForegroundColor Red
    $depsOk = $false
} else {
    Write-Host "[OK] electron-builder installed" -ForegroundColor Green
}

Write-Host ""

# Check documentation
Write-Host "Checking documentation..." -ForegroundColor Yellow
$docsOk = $true

if (-not (Test-Path "docs/windows-support.md")) {
    Write-Host "[X] docs/windows-support.md not found" -ForegroundColor Red
    $docsOk = $false
} else {
    Write-Host "[OK] docs/windows-support.md exists" -ForegroundColor Green
}

if (-not (Test-Path "docs/windows-quick-start.md")) {
    Write-Host "[X] docs/windows-quick-start.md not found" -ForegroundColor Red
    $docsOk = $false
} else {
    Write-Host "[OK] docs/windows-quick-start.md exists" -ForegroundColor Green
}

Write-Host ""

# Summary
Write-Host "Summary" -ForegroundColor Cyan
Write-Host "=======" -ForegroundColor Cyan

$allOk = $true

if ($filesOk) {
    Write-Host "[OK] Files check passed" -ForegroundColor Green
} else {
    Write-Host "[X] Files check failed" -ForegroundColor Red
    $allOk = $false
}

if ($configOk) {
    Write-Host "[OK] Configuration check passed" -ForegroundColor Green
} else {
    Write-Host "[X] Configuration check failed" -ForegroundColor Red
    $allOk = $false
}

if ($depsOk) {
    Write-Host "[OK] Dependencies check passed" -ForegroundColor Green
} else {
    Write-Host "[X] Dependencies check failed" -ForegroundColor Red
    $allOk = $false
}

if ($docsOk) {
    Write-Host "[OK] Documentation check passed" -ForegroundColor Green
} else {
    Write-Host "[X] Documentation check failed" -ForegroundColor Red
    $allOk = $false
}

Write-Host ""

if ($allOk) {
    Write-Host "All checks passed!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    if (-not (Test-Path "build/icon.ico")) {
        Write-Host "1. Generate Windows icon: see scripts/generate-windows-icon.md" -ForegroundColor White
        Write-Host "2. Run build: pnpm package:win" -ForegroundColor White
    } else {
        Write-Host "1. Run build: pnpm package:win" -ForegroundColor White
        Write-Host "2. Test on Windows" -ForegroundColor White
    }
} else {
    Write-Host "Issues found - please fix them" -ForegroundColor Yellow
}

Write-Host ""
