# 发布流程指南

本文档说明如何发布新版本并同步到 CDN。

## 发布流程概览

```
1. 更新版本号
   ↓
2. 构建应用
   ↓
3. 测试应用
   ↓
4. 发布到 GitHub Release
   ↓
5. 同步到 OSS CDN
   ↓
6. 验证更新功能
```

## 详细步骤

### 1. 更新版本号

编辑 `package.json`：

```json
{
  "version": "0.2.1"  // 修改为新版本号
}
```

### 2. 构建应用

#### Windows 版本

```bash
# 构建 x64 和 ia32 版本
pnpm run package:win

# 或只构建 x64 版本
pnpm run package:win:x64
```

#### macOS 版本

```bash
pnpm run package
```

构建完成后，文件会生成在 `release/` 目录：

```
release/
├── PetBuddy-Setup-0.2.1.exe        # Windows 安装包
├── PetBuddy-0.2.1-arm64.dmg        # macOS DMG
├── PetBuddy-0.2.1-arm64-mac.zip    # macOS ZIP
├── latest.yml                       # Windows 更新信息
└── latest-mac.yml                   # macOS 更新信息
```

### 3. 测试应用

安装并测试新构建的应用：

- ✅ 应用能正常启动
- ✅ 核心功能正常工作
- ✅ 没有明显的 bug
- ✅ 更新功能正常（如果是更新相关的改动）

### 4. 发布到 GitHub Release

#### 方法 A：使用 GitHub CLI（推荐）

```bash
# 创建 Release 并上传文件
gh release create v0.2.1 \
  ./release/PetBuddy-Setup-0.2.1.exe \
  ./release/PetBuddy-0.2.1-arm64.dmg \
  ./release/PetBuddy-0.2.1-arm64-mac.zip \
  ./release/latest.yml \
  ./release/latest-mac.yml \
  --title "v0.2.1" \
  --notes "Release notes here"
```

#### 方法 B：使用 GitHub 网页

1. 访问 https://github.com/你的用户名/PetBuddy/releases/new
2. 填写 Tag version: `v0.2.1`
3. 填写 Release title: `v0.2.1`
4. 填写 Release notes（更新说明）
5. 上传 `release/` 目录中的所有文件
6. 点击 "Publish release"

### 5. 同步到 OSS CDN

```bash
# 上传到 OSS
pnpm run upload:oss v0.2.1
```

**预期输出：**

```
✅ 已加载 .env 配置文件

📦 开始上传版本: v0.2.1
📁 本地目录: F:\PetBuddy\release
☁️  OSS Bucket: petbuddy-releases
🌍 区域: oss-cn-beijing

✅ 上传成功: latest.yml
✅ 上传成功: latest-mac.yml
✅ 上传成功: v0.2.1/PetBuddy-Setup-0.2.1.exe
✅ 上传成功: v0.2.1/PetBuddy-0.2.1-arm64.dmg
✅ 上传成功: v0.2.1/PetBuddy-0.2.1-arm64-mac.zip

✨ 所有文件上传完成！

🔗 访问地址：
   https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/latest.yml
   https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/v0.2.1/
```

### 6. 验证更新功能

#### 验证 OSS 文件

在浏览器中访问：

```
https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/latest.yml
```

应该看到类似内容：

```yaml
version: 0.2.1
files:
  - url: PetBuddy-Setup-0.2.1.exe
    sha512: ...
    size: ...
path: PetBuddy-Setup-0.2.1.exe
sha512: ...
releaseDate: '2026-05-10T...'
```

#### 测试应用更新

1. 安装旧版本（如 v0.2.0）
2. 运行应用
3. 打开设置 → 关于
4. 点击"检查更新"
5. 应该提示发现新版本 v0.2.1
6. 点击"下载更新"
7. 下载完成后自动安装

## 快速发布脚本

你可以创建一个脚本来自动化发布流程：

### Windows PowerShell 脚本

创建 `release.ps1`：

```powershell
param(
    [Parameter(Mandatory=$true)]
    [string]$Version
)

Write-Host "🚀 开始发布 PetBuddy $Version" -ForegroundColor Green

# 1. 构建应用
Write-Host "`n📦 构建应用..." -ForegroundColor Cyan
pnpm run package:win:x64
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 构建失败" -ForegroundColor Red
    exit 1
}

# 2. 发布到 GitHub
Write-Host "`n📤 发布到 GitHub..." -ForegroundColor Cyan
gh release create $Version `
    ./release/PetBuddy-Setup-$Version.exe `
    ./release/latest.yml `
    --title "$Version" `
    --generate-notes

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ GitHub 发布失败" -ForegroundColor Red
    exit 1
}

# 3. 上传到 OSS
Write-Host "`n☁️  上传到 OSS..." -ForegroundColor Cyan
pnpm run upload:oss $Version
if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ OSS 上传失败" -ForegroundColor Red
    exit 1
}

Write-Host "`n✨ 发布完成！" -ForegroundColor Green
Write-Host "🔗 GitHub: https://github.com/你的用户名/PetBuddy/releases/tag/$Version"
Write-Host "🔗 CDN: https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/$Version/"
```

使用方法：

```powershell
.\release.ps1 -Version v0.2.1
```

## 版本号规范

遵循语义化版本（Semantic Versioning）：

- **主版本号（Major）**：不兼容的 API 修改
  - 例如：`1.0.0` → `2.0.0`
  
- **次版本号（Minor）**：向下兼容的功能性新增
  - 例如：`0.2.0` → `0.3.0`
  
- **修订号（Patch）**：向下兼容的问题修正
  - 例如：`0.2.0` → `0.2.1`

## Release Notes 模板

```markdown
## 🎉 新功能

- 添加了 XXX 功能
- 支持 XXX 特性

## 🐛 Bug 修复

- 修复了 XXX 问题
- 解决了 XXX 崩溃

## 🔧 改进

- 优化了 XXX 性能
- 改进了 XXX 体验

## 📦 其他

- 更新了依赖版本
- 改进了文档

## 下载

- Windows: [PetBuddy-Setup-0.2.1.exe](链接)
- macOS: [PetBuddy-0.2.1-arm64.dmg](链接)

国内用户更新速度已优化，使用阿里云 CDN 加速。
```

## 回滚流程

如果发现新版本有严重问题，需要回滚：

### 1. 删除 GitHub Release

```bash
gh release delete v0.2.1 --yes
```

### 2. 恢复 OSS 旧版本

```bash
# 重新上传旧版本的 latest.yml
node scripts/upload-to-oss.mjs v0.2.0
```

### 3. 通知用户

在 GitHub 发布说明中标注该版本已撤回。

## 最佳实践

1. ✅ **测试充分**：发布前在本地充分测试
2. ✅ **版本号规范**：遵循语义化版本规范
3. ✅ **Release Notes**：详细记录更新内容
4. ✅ **双源发布**：同时发布到 GitHub 和 OSS
5. ✅ **验证更新**：发布后验证更新功能正常
6. ✅ **保留旧版本**：OSS 中保留最近 5-10 个版本
7. ✅ **监控流量**：定期检查 OSS 流量和成本

## 常见问题

### Q: 如何只发布到 OSS，不发布到 GitHub？

A: 不推荐。建议保持 GitHub 作为主发布渠道，OSS 作为加速镜像。

### Q: 如何清理 OSS 中的旧版本？

A: 在 OSS 控制台手动删除旧版本目录，或配置生命周期规则自动清理。

### Q: 发布失败了怎么办？

A: 检查错误信息，常见原因：
- GitHub token 权限不足
- OSS 访问密钥错误
- 网络连接问题
- 文件路径错误

### Q: 如何发布 Beta 版本？

A: 使用不同的 channel：
```bash
# 上传到 beta 目录
node scripts/upload-to-oss.mjs v0.2.1-beta
```

然后在应用中配置 `channel: 'beta'`。
