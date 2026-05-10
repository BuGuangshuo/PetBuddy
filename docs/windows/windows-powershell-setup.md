# Windows PowerShell 设置指南

## 🎯 概述

本指南帮助解决在 Windows 上使用 pnpm 和 Electron 时常见的 PowerShell 执行策略问题。

## ⚠️ 常见错误

### 错误 1: 脚本执行被禁止

```
pnpm : 无法加载文件 C:\Users\xxx\AppData\Roaming\npm\pnpm.ps1，
因为在此系统上禁止运行脚本。
```

### 错误 2: Electron 安装失败

```
Error: Electron failed to install correctly
```

## ✅ 解决方案

### 方案 1: 使用项目配置（推荐）

项目已包含 `.npmrc` 配置文件，自动使用 PowerShell 作为脚本 shell：

```ini
# .npmrc
script-shell=powershell
```

这个配置对大多数情况都有效，无需额外设置。

### 方案 2: 修改执行策略（如果方案1无效）

#### 选项 A: 当前用户（推荐）

以**普通用户**身份运行 PowerShell：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

这只影响当前用户，不需要管理员权限。

#### 选项 B: 本地机器（需要管理员）

以**管理员**身份运行 PowerShell：

```powershell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope LocalMachine
```

这会影响所有用户。

### 方案 3: 临时绕过（仅用于测试）

```powershell
Set-ExecutionPolicy -ExecutionPolicy Bypass -Scope Process
```

这只在当前 PowerShell 会话中有效，关闭窗口后失效。

## 📊 执行策略说明

| 策略 | 说明 | 推荐度 |
|------|------|--------|
| `Restricted` | 默认策略，不允许运行任何脚本 | ❌ 不推荐 |
| `RemoteSigned` | 允许本地脚本，远程脚本需要签名 | ✅ 推荐 |
| `Unrestricted` | 允许所有脚本，但会警告 | ⚠️ 谨慎使用 |
| `Bypass` | 允许所有脚本，无警告 | ⚠️ 仅临时使用 |

## 🔍 检查当前策略

```powershell
Get-ExecutionPolicy -List
```

输出示例：
```
        Scope ExecutionPolicy
        ----- ---------------
MachinePolicy       Undefined
   UserPolicy       Undefined
      Process       Undefined
  CurrentUser    RemoteSigned
 LocalMachine       Undefined
```

## 🛠️ 完整设置流程

### 步骤 1: 检查 Node.js 和 pnpm

```powershell
# 检查 Node.js 版本（需要 >= 20）
node --version

# 检查 pnpm 版本（需要 >= 9）
pnpm --version

# 如果没有 pnpm，安装它
npm install -g pnpm
```

### 步骤 2: 设置执行策略

```powershell
# 查看当前策略
Get-ExecutionPolicy -Scope CurrentUser

# 如果不是 RemoteSigned，设置它
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 步骤 3: 验证 .npmrc 配置

确保项目根目录有 `.npmrc` 文件，内容为：

```ini
script-shell=powershell
```

### 步骤 4: 安装依赖

```powershell
# 清理缓存（可选）
pnpm store prune

# 安装依赖
pnpm install

# 如果 Electron 安装失败，手动运行安装脚本
node node_modules/electron/install.js
```

### 步骤 5: 启动开发服务器

```powershell
pnpm dev
```

## 🐛 故障排除

### 问题 1: pnpm 命令不存在

**症状**：
```
pnpm : 无法将"pnpm"项识别为 cmdlet、函数、脚本文件或可运行程序的名称。
```

**解决**：
```powershell
# 重新安装 pnpm
npm install -g pnpm

# 刷新环境变量
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")
```

### 问题 2: Electron 下载超时

**症状**：
```
Error: Electron download timeout
```

**解决**：
```powershell
# 设置 Electron 镜像（中国用户）
$env:ELECTRON_MIRROR="https://npmmirror.com/mirrors/electron/"

# 重新安装
pnpm install
```

### 问题 3: 权限被拒绝

**症状**：
```
Access is denied
```

**解决**：
1. 以管理员身份运行 PowerShell
2. 或者检查文件夹权限
3. 或者尝试在不同的目录（如 `C:\Projects`）

### 问题 4: 路径包含空格或特殊字符

**症状**：构建或运行时出现奇怪的错误

**解决**：
- 避免在项目路径中使用空格
- 避免使用中文或特殊字符
- 推荐路径：`C:\Projects\PetBuddy`

## 🔐 安全注意事项

### 为什么需要修改执行策略？

PowerShell 的默认策略 `Restricted` 是为了安全，防止恶意脚本运行。但这也阻止了合法的开发工具（如 pnpm、npm）运行。

### RemoteSigned 安全吗？

是的，`RemoteSigned` 是一个平衡的选择：
- ✅ 允许本地脚本运行（如 pnpm）
- ✅ 要求从互联网下载的脚本有数字签名
- ✅ 保护你免受未签名的远程脚本攻击

### 最佳实践

1. **仅修改 CurrentUser 范围**：不影响其他用户
2. **不要使用 Unrestricted 或 Bypass**：除非临时测试
3. **定期更新工具**：保持 Node.js、pnpm、Electron 最新
4. **使用官方源**：避免从不可信的源下载包

## 📚 参考资源

- [PowerShell 执行策略官方文档](https://docs.microsoft.com/powershell/module/microsoft.powershell.core/about/about_execution_policies)
- [pnpm 官方文档](https://pnpm.io/)
- [Electron 官方文档](https://www.electronjs.org/)

## 💡 快速命令参考

```powershell
# 查看执行策略
Get-ExecutionPolicy -List

# 设置执行策略（当前用户）
Set-ExecutionPolicy RemoteSigned -Scope CurrentUser

# 检查 Node.js 和 pnpm
node --version
pnpm --version

# 安装依赖
pnpm install

# 手动安装 Electron
node node_modules/electron/install.js

# 启动开发服务器
pnpm dev

# 构建 Windows 版本
pnpm package:win
```

## 🆘 仍然有问题？

1. 检查 Windows 版本（需要 Windows 10+）
2. 检查杀毒软件是否阻止
3. 尝试在新的 PowerShell 窗口中运行
4. 重启计算机后再试
5. 查看项目的 GitHub Issues
