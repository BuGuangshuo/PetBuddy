# PetBuddy

PetBuddy 是一个基于 Electron + React 的 macOS 桌面宠物应用。它会常驻桌面边缘，用动态小狗陪你工作，并在合适的时间提醒你休息、喝水和回到专注状态。

这个项目目前主要面向 Apple Silicon Mac（`macOS arm64`）开发和发布。

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
- macOS 开发环境

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
pnpm package:release # 签名/公证发布包
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

- 当前发布目标主要是 `macOS arm64`
- 专注监控依赖 macOS 的辅助功能 / Accessibility 权限
- 开发模式下可以运行，但部分更新流程需要打包后的应用才能完整验证

## 打包与发布

本项目使用 `electron-builder` 进行打包，macOS 发布流程见：

- [docs/macos-release.md](/Users/alanbu/PetBuddy/docs/macos-release.md)

发布时需要重点确认：

- `package.json` 版本号与 Git tag 一致
- 生成并上传 `.dmg`、`.zip`、`latest-mac.yml`
- 签名与 notarization 配置完整

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
