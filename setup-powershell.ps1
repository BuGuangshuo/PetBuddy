# PowerShell 执行策略设置脚本
# 请以管理员身份运行此脚本

Write-Host "Setting PowerShell Execution Policy..." -ForegroundColor Cyan
Write-Host ""

# 检查是否以管理员身份运行
$isAdmin = ([Security.Principal.WindowsPrincipal] [Security.Principal.WindowsIdentity]::GetCurrent()).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)

if (-not $isAdmin) {
    Write-Host "[!] This script needs to be run as Administrator" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Please:" -ForegroundColor White
    Write-Host "1. Right-click on PowerShell" -ForegroundColor White
    Write-Host "2. Select 'Run as Administrator'" -ForegroundColor White
    Write-Host "3. Run this script again" -ForegroundColor White
    Write-Host ""
    Write-Host "Or run this command manually:" -ForegroundColor Cyan
    Write-Host "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned" -ForegroundColor Green
    Write-Host ""
    pause
    exit 1
}

Write-Host "Current Execution Policy:" -ForegroundColor Yellow
Get-ExecutionPolicy -List | Format-Table -AutoSize

Write-Host ""
Write-Host "Setting execution policy for CurrentUser to RemoteSigned..." -ForegroundColor Yellow

try {
    Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned -Force
    Write-Host "[OK] Execution policy set successfully!" -ForegroundColor Green
    Write-Host ""
    
    Write-Host "New Execution Policy:" -ForegroundColor Yellow
    Get-ExecutionPolicy -List | Format-Table -AutoSize
    
    Write-Host ""
    Write-Host "You can now run: pnpm dev" -ForegroundColor Cyan
    Write-Host ""
} catch {
    Write-Host "[X] Failed to set execution policy: $_" -ForegroundColor Red
    Write-Host ""
    Write-Host "Please run this command manually:" -ForegroundColor Yellow
    Write-Host "Set-ExecutionPolicy -Scope CurrentUser -ExecutionPolicy RemoteSigned" -ForegroundColor Green
    Write-Host ""
}

pause
