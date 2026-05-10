# Windows 快速入门指南

## 📋 系统要求

- Windows 10 或更高版本
- Node.js 20 或更高版本
- pnpm 9 或更高版本

## 🚀 快速开始

### 1. 安装依赖

```bash
# 安装 pnpm（如果还没有安装）
npm install -g pnpm

# 克隆项目
git clone <repository-url>
cd PetBuddy

# 安装依赖
pnpm install
```

### 2. 开发模式

```bash
pnpm dev
```

这将启动开发服务器并打开 Electron 应用窗口。

### 3. 构建 Windows 版本

```bash
# 构建 32位和64位版本
pnpm package:win
```

构建完成后，安装程序将位于 `dist` 目录：
- `PetBuddy Setup x.x.x.exe` - 64位安装程序
- `PetBuddy Setup x.x.x-ia32.exe` - 32位安装程序

## 🔧 常见问题

### PowerShell 执行策略错误

如果遇到以下错误：
```
无法加载文件，因为在此系统上禁止运行脚本
```

**解决方案**：项目已配置 `.npmrc` 文件自动处理此问题。如果仍有问题，可以手动设置：

```powershell
# 以管理员身份运行 PowerShell
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### Electron 安装失败

如果 `pnpm install` 时 Electron 安装失败：

```bash
# 手动安装 Electron
node node_modules/electron/install.js
```

### GPU 警告

开发模式下可能会看到 GPU 相关警告：
```
ERROR:gpu_init.cc(523)] Passthrough is not supported
```

这是正常的，不影响应用功能，可以忽略。

## 📦 安装程序功能

Windows 安装程序（NSIS）包含以下功能：

- ✅ 自定义安装目录
- ✅ 创建桌面快捷方式
- ✅ 创建开始菜单快捷方式
- ✅ 支持卸载
- ✅ 支持 32位和64位系统

## 🎯 可用命令

```bash
# 开发
pnpm dev              # 启动开发服务器
pnpm build            # 构建项目
pnpm preview          # 预览构建结果

# 测试
pnpm test             # 运行测试
pnpm test:watch       # 监视模式运行测试
pnpm typecheck        # TypeScript 类型检查

# 打包
pnpm package:win      # 构建 Windows 版本（32位+64位）
pnpm package:win:release  # 构建发布版本

# 工具
pnpm generate:icon    # 生成 Windows 图标文件
```

## 📝 开发注意事项

### 热重载

开发模式下，代码更改会自动重载：
- 渲染进程（React）：即时热重载
- 主进程（Electron）：自动重启

### 调试

- 按 `F12` 或 `Ctrl+Shift+I` 打开开发者工具
- 主进程日志会显示在启动终端中

### 构建优化

构建时会自动：
- 压缩代码
- 优化资源
- 生成源映射（source maps）

## 🔗 相关资源

- [Electron 文档](https://www.electronjs.org/docs)
- [Vite 文档](https://vitejs.dev/)
- [React 文档](https://react.dev/)
- [electron-builder 文档](https://www.electron.build/)

## 💡 提示

1. **首次运行**：首次运行 `pnpm dev` 可能需要几分钟来下载 Electron
2. **网络问题**：如果下载 Electron 很慢，可以配置镜像源
3. **杀毒软件**：某些杀毒软件可能会误报，需要添加信任
4. **防火墙**：首次运行可能需要允许防火墙访问

## 🆘 获取帮助

如果遇到问题：
1. 查看 [docs/windows-support.md](./windows-support.md) 了解详细配置
2. 检查 [GitHub Issues](https://github.com/your-repo/issues)
3. 提交新的 Issue 描述问题
