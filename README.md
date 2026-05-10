# PetBuddy

PetBuddy 是一个基于 Electron + React 的桌面宠物应用。它会常驻桌面边缘，用动态小狗陪你工作，并在合适的时间提醒你休息、喝水和回到专注状态。

这个项目支持 **macOS**（Apple Silicon）和 **Windows**（32位和64位）平台。

## 平台支持

- ✅ **macOS** (Apple Silicon / arm64) - 完整功能支持
- ✅ **Windows** (32位 / 64位) - 核心功能支持
  - ⚠️ 注意：Windows 上的专注模式无法自动检测分心应用，需要手动管理

详细的平台差异说明请查看 [Windows 支持文档](docs/windows-support.md)。

## 功能概览

- 桌面宠物常驻显示，可拖拽位置
- 休息提醒、喝水提醒
- 专注模式与专注时长统计
- 检测分心应用并给出专注提醒
- 两套宠物形象：`line-dog`、`golden-puppy`
- 支持按场景替换宠物 GIF 资源
- 设置页内检查更新与安装更新
- 本地保存设置和每日统计数据

## 适合谁

PetBuddy 适合希望在桌面上放一个轻量陪伴型提醒工具的用户，尤其是需要：

- 定时起来活动
- 记得补水
- 在工作时减少分心

## 技术栈

- Electron
- React 19
- TypeScript
- Vite / electron-vite
- Vitest
- electron-store
- electron-updater

## 快速开始

### 环境要求

- Node.js `>= 20`
- pnpm `>= 9`
- macOS 或 Windows 开发环境

**Windows 用户**：如果遇到 PowerShell 执行策略问题，请查看 [Windows 快速入门指南](docs/windows-quick-start.md) 和 [PowerShell 设置指南](docs/windows-powershell-setup.md)。

### 安装依赖

```bash
pnpm install
```

### 启动开发环境

```bash
pnpm dev
```

### 运行测试

```bash
pnpm test
```

### 类型检查

```bash
pnpm typecheck
```

## 常用脚本

```bash
pnpm dev             # 启动 Electron 开发环境
pnpm build           # 构建应用产物
pnpm preview         # 预览构建结果
pnpm test            # 运行 Vitest
pnpm test:watch      # 监听模式测试
pnpm typecheck       # TypeScript 类型检查
pnpm package         # 本地打包 macOS arm64 版本
pnpm package:release # 签名/公证发布包（macOS）
pnpm package:win     # 打包 Windows 版本（32位和64位）
pnpm package:win:release # 打包 Windows 发布版本
```

## 项目结构

```text
src/
  main/        Electron 主进程，窗口、提醒、权限、更新、存储
  preload/     preload 桥接层，向渲染进程暴露 API
  renderer/    设置页和宠物界面的前端代码
  shared/      主进程与渲染进程共享的类型、默认值和业务逻辑
tests/         单元测试和行为测试
pet_assets/    宠物 GIF 资源
build/         图标、entitlements 等打包资源
docs/          设计文档、发布说明
```

## 核心模块说明

- `src/main/index.ts`
  应用入口，负责初始化窗口、提醒服务、专注监控、更新服务和 IPC。

- `src/main/services/reminderService.ts`
  管理休息提醒、喝水提醒和专注提醒的调度与展示。

- `src/main/services/focusMonitor.ts`
  通过 macOS 前台应用检测专注状态，对分心应用进行监控。

- `src/main/services/petCatalog.ts`
  从 `pet_assets/` 读取 GIF 资源，并生成不同场景下的宠物素材目录。

- `src/renderer/src/settings-main.tsx`
  设置页主界面，负责展示和修改用户配置。

## 资源与自定义

项目内置两套宠物资源，按场景组织在 `pet_assets/` 下，例如：

- `idle`
- `breakPrompt`
- `hydrationPrompt`
- `focusGuard`
- `focusAlert`
- `focusDone`

应用支持为特定宠物和场景指定自定义 GIF，适合做个性化替换或扩展。

## 数据存储

应用使用 `electron-store` 保存：

- 用户设置
- 每日提醒统计
- 专注时长与分心时长
- 自定义 GIF 配置

## 平台与权限说明

### macOS
- 发布目标：`macOS arm64` (Apple Silicon)
- 专注监控依赖 macOS 的辅助功能 / Accessibility 权限
- 开发模式下可以运行，但部分更新流程需要打包后的应用才能完整验证

### Windows
- 发布目标：`Windows x64` 和 `Windows ia32` (32位)
- 不需要特殊权限
- 专注模式的应用监控功能不可用（无法自动检测分心应用）
- 其他核心功能完全可用

详细说明请查看：
- macOS 发布流程：[docs/macos-release.md](docs/macos-release.md)
- Windows 支持说明：[docs/windows-support.md](docs/windows-support.md)

## 打包与发布

本项目使用 `electron-builder` 进行打包，并通过 **GitHub Actions** 实现跨平台自动构建。

### 🚀 自动化发布（推荐）

使用 GitHub Actions 可以在云端同时构建 Windows 和 macOS 版本：

```bash
# 1. 更新版本号（编辑 package.json）
# 2. 提交更改
git add .
git commit -m "chore: bump version to vx.x.x"

# 3. 创建并推送版本标签
git tag vx.x.x
git push origin vx.x.x

# 4. GitHub Actions 会自动：
#    - 在 Windows 虚拟机上构建 Windows 安装包
#    - 在 macOS 虚拟机上构建 macOS 安装包
#    - 创建 GitHub Release（草稿）
#    - 上传所有安装包到 Release
```

详细配置说明请查看：[.github/workflows/README.md](.github/workflows/README.md)

### 本地打包

#### macOS 发布流程
详见：[docs/macos-release.md](docs/macos-release.md)

```bash
pnpm run package         # 本地打包（无签名）
pnpm run package:release # 签名和公证发布包
```

发布时需要重点确认：
- `package.json` 版本号与 Git tag 一致
- 生成并上传 `.dmg`、`.zip`、`latest-mac.yml`
- 签名与 notarization 配置完整

#### Windows 发布流程
详见：[docs/windows-support.md](docs/windows-support.md)

```bash
pnpm run package:win:x64     # 仅打包 64 位版本
pnpm run package:win         # 打包 32 位和 64 位版本
pnpm run package:win:release # 打包发布版本
```

发布时需要重点确认：
- `package.json` 版本号与 Git tag 一致
- 准备好 `build/icon.ico` 文件
- 生成并上传 `.exe`（两个架构）、`.zip`（两个架构）、`latest.yml`

### 跨平台打包说明

⚠️ **重要提示**：
- 在 **Windows** 电脑上只能打包 Windows 版本
- 在 **macOS** 电脑上只能打包 macOS 版本
- 使用 **GitHub Actions** 可以在云端同时构建两个平台的版本（推荐）

## 测试

当前测试覆盖了多类核心逻辑，包括：

- 提醒调度
- 专注状态计算
- 设置页行为
- 更新服务
- 窗口管理
- 共享数据结构与工具函数

测试目录位于：

- `/Users/alanbu/PetBuddy/tests`

## 许可证

MIT
