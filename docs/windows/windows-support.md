# Windows 支持配置

## ✅ 已完成的配置

### 1. Package.json 配置
- ✅ 添加了 Windows 构建脚本：
  - `package:win` - 构建 32位和64位 Windows 版本
  - `package:win:release` - 构建发布版本
- ✅ 配置了 electron-builder 的 Windows 目标：
  - NSIS 安装程序（支持 x64 和 ia32）
  - ZIP 压缩包（支持 x64 和 ia32）
- ✅ NSIS 安装程序配置：
  - 非单击安装（用户可选择安装目录）
  - 创建桌面快捷方式
  - 创建开始菜单快捷方式
- ✅ 禁用代码签名（`signAndEditExecutable: false`）以避免符号链接权限问题

### 2. 开发环境
- ✅ 解决了 PowerShell 执行策略问题（通过 `.npmrc`）
- ✅ Electron 安装成功
- ✅ 开发服务器正常运行

### 3. 构建验证
- ✅ Windows 构建成功完成
- ✅ 生成的文件：
  - `PetBuddy Setup 0.1.2.exe` (101.32 MB) - 通用安装程序（支持 x64 和 ia32）
  - `PetBuddy-0.1.2-win.zip` (139.51 MB) - 64位便携版
  - `PetBuddy-0.1.2-ia32-win.zip` (139.51 MB) - 32位便携版
  - `latest.yml` - 自动更新元数据

## ⚠️ 待完成的任务

### 1. Windows 图标文件
**状态**: ✅ 已完成

**当前资源**:
- ✅ `build/icon.png` (195KB)
- ✅ `build/icon.icns` (macOS 图标)
- ✅ `build/icon.ico` (Windows 图标，285KB)

### 2. 测试 Windows 构建
**状态**: ✅ 构建成功

已成功生成：
- ✅ `PetBuddy Setup 0.1.2.exe` (101.32 MB) - 通用安装程序
- ✅ `PetBuddy-0.1.2-win.zip` (139.51 MB) - 64位便携版
- ✅ `PetBuddy-0.1.2-ia32-win.zip` (139.51 MB) - 32位便携版
- ✅ `latest.yml` - 自动更新元数据

### 3. 待测试项目

- 🔲 在 Windows 64位系统上测试安装程序
- 🔲 在 Windows 32位系统上测试安装程序（如果可能）
- 🔲 验证所有功能正常工作
- 🔲 测试应用内更新功能

## 📋 构建命令

### 开发
```bash
pnpm dev          # 启动开发服务器
```

### 构建
```bash
# macOS (M芯片)
pnpm package

# Windows (32位 + 64位)
pnpm package:win

# 发布版本
pnpm package:release        # macOS
pnpm package:win:release    # Windows
```

## 🔧 已知问题

### 1. GPU 警告
在 Windows 上运行开发服务器时，可能会看到 GPU 相关的警告：
```
ERROR:gpu_init.cc(523)] Passthrough is not supported, GL is disabled, ANGLE is
```

**影响**: 无，这是 Electron 在某些 Windows 环境下的正常行为
**解决**: 可以忽略，不影响应用功能

### 2. PowerShell 执行策略
如果遇到脚本执行被阻止的问题，已通过 `.npmrc` 配置解决：
```
script-shell=powershell
```

### 3. 代码签名问题（已解决）
**问题**: 构建时出现符号链接创建失败错误
```
ERROR: Cannot create symbolic link
```

**原因**: electron-builder 的 winCodeSign 工具包含 macOS 符号链接，Windows 上创建符号链接需要特殊权限

**解决方案**: 在 package.json 中添加 `"signAndEditExecutable": false` 禁用代码签名
- 开发和测试阶段不需要代码签名
- 正式发布时可以使用专业的代码签名证书

## 📝 更新日志

### 2026-05-10
- ✅ 添加 Windows 平台支持（32位和64位）
- ✅ 配置 NSIS 安装程序
- ✅ 解决 PowerShell 执行策略问题
- ✅ 修复 Electron 安装问题
- ✅ 创建 Windows 图标文件 (icon.ico)
- ✅ 解决代码签名符号链接问题
- ✅ 成功构建 Windows 版本
  - 通用安装程序 (101.32 MB)
  - 64位便携版 (139.51 MB)
  - 32位便携版 (139.51 MB)

## 🎯 下一步行动

1. ✅ **已完成**: 创建 `build/icon.ico` 文件
2. ✅ **已完成**: 运行 `pnpm package:win` 测试构建
3. **待测试**: 在 Windows 机器上测试安装程序和应用功能

## 📚 相关文档

- [Electron Builder - Windows](https://www.electron.build/configuration/win)
- [NSIS 配置](https://www.electron.build/configuration/nsis)
