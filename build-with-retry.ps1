# Windows 打包重试脚本
# 用于解决 EBUSY 文件锁定问题

$maxRetries = 3
$retryCount = 0
$success = $false

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "PetBuddy Windows 打包脚本" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

while ($retryCount -lt $maxRetries -and -not $success) {
    $attempt = $retryCount + 1
    Write-Host "尝试构建... (第 $attempt/$maxRetries 次)" -ForegroundColor Yellow
    Write-Host ""
    
    # 清理旧文件
    if (Test-Path "dist\win-unpacked") {
        Write-Host "清理旧的构建文件..." -ForegroundColor Gray
        Remove-Item -Path "dist\win-unpacked" -Recurse -Force -ErrorAction SilentlyContinue
        Start-Sleep -Seconds 3
    }
    
    # 运行构建
    Write-Host "开始构建..." -ForegroundColor Green
    pnpm run package:win:x64
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host ""
        Write-Host "========================================" -ForegroundColor Green
        Write-Host "构建成功！" -ForegroundColor Green
        Write-Host "========================================" -ForegroundColor Green
        Write-Host ""
        Write-Host "输出文件位置：" -ForegroundColor Cyan
        Write-Host "  - dist\PetBuddy-Setup-0.2.0.exe" -ForegroundColor White
        Write-Host "  - dist\win-unpacked\" -ForegroundColor White
        Write-Host ""
        $success = $true
        exit 0
    }
    
    $retryCount++
    
    if ($retryCount -lt $maxRetries) {
        Write-Host ""
        Write-Host "构建失败，等待 10 秒后重试..." -ForegroundColor Red
        Write-Host "提示：如果持续失败，请尝试临时禁用 Windows Defender 实时保护" -ForegroundColor Yellow
        Write-Host ""
        Start-Sleep -Seconds 10
    }
}

if (-not $success) {
    Write-Host ""
    Write-Host "========================================" -ForegroundColor Red
    Write-Host "构建失败，已达到最大重试次数" -ForegroundColor Red
    Write-Host "========================================" -ForegroundColor Red
    Write-Host ""
    Write-Host "请尝试以下解决方案：" -ForegroundColor Yellow
    Write-Host "1. 临时禁用 Windows Defender 实时保护" -ForegroundColor White
    Write-Host "2. 将 dist 目录添加到 Windows Defender 排除项" -ForegroundColor White
    Write-Host "3. 关闭所有文件资源管理器窗口" -ForegroundColor White
    Write-Host "4. 以管理员身份运行此脚本" -ForegroundColor White
    Write-Host ""
    Write-Host "详细说明请查看：WINDOWS_PACKAGING_TROUBLESHOOTING.md" -ForegroundColor Cyan
    Write-Host ""
    exit 1
}
