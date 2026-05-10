# GitHub Actions 工作流说明

本项目使用 GitHub Actions 实现跨平台自动打包，支持 Windows 和 macOS。

## 工作流文件

### 1. `build.yml` - 正式发布构建

**触发条件：**
- 推送版本标签（如 `v0.2.0`）
- 手动触发（在 GitHub Actions 页面）

**功能：**
- 在 Windows 和 macOS 虚拟机上分别构建安装包
- 自动创建 GitHub Release（草稿）
- 上传所有平台的安装包到 Release

**使用方法：**
```bash
# 1. 更新版本号
# 编辑 package.json 中的 version 字段

# 2. 提交更改
git add .
git commit -m "chore: bump version to 0.2.0"

# 3. 创建并推送标签
git tag v0.2.0
git push origin v0.2.0

# 4. 等待 GitHub Actions 完成构建
# 5. 在 GitHub Releases 页面查看并发布草稿
```

### 2. `test-build.yml` - 测试构建

**触发条件：**
- 推送到主分支（main/master/develop）
- 创建 Pull Request

**功能：**
- 运行类型检查
- 运行测试
- 验证项目可以成功构建

## 配置 GitHub Secrets

### 基础配置（必需）

GitHub Actions 会自动使用 `GITHUB_TOKEN` 创建 Release，无需额外配置。

### OSS 上传配置（可选）

如果需要**自动上传到阿里云 OSS**，需要在 GitHub 仓库设置中添加以下 Secrets：

1. 进入仓库的 `Settings` > `Secrets and variables` > `Actions`
2. 点击 `New repository secret` 添加以下变量：

| Secret 名称 | 说明 | 示例值 | 是否必需 |
|------------|------|--------|---------|
| `OSS_ACCESS_KEY_ID` | 阿里云 OSS Access Key ID | `LTAI5t...` | ✅ 必需 |
| `OSS_ACCESS_KEY_SECRET` | 阿里云 OSS Access Key Secret | `xxx...` | ✅ 必需 |
| `OSS_REGION` | OSS 区域 | `oss-cn-beijing` | ✅ 必需 |
| `OSS_BUCKET` | OSS 存储桶名称 | `petbuddy-releases` | ✅ 必需 |

**配置后的行为：**
- ✅ 构建完成后会**自动上传**所有安装包到 OSS
- ✅ 同时也会创建 GitHub Release
- ✅ 用户可以从 OSS 或 GitHub 下载更新

**不配置的行为：**
- ✅ 只创建 GitHub Release
- ✅ 用户从 GitHub Releases 下载更新

## macOS 代码签名（可选）

如果需要对 macOS 应用进行代码签名和公证，需要：

1. 拥有 Apple 开发者账号
2. 添加以下 Secrets：
   - `CSC_LINK`: Base64 编码的证书文件
   - `CSC_KEY_PASSWORD`: 证书密码
   - `APPLE_ID`: Apple ID 邮箱
   - `APPLE_APP_SPECIFIC_PASSWORD`: App 专用密码
   - `APPLE_TEAM_ID`: 团队 ID

3. 修改 `build.yml` 中的 macOS 构建步骤：
   ```yaml
   - name: Build macOS app (with code signing)
     run: pnpm run package:release
     env:
       CSC_LINK: ${{ secrets.CSC_LINK }}
       CSC_KEY_PASSWORD: ${{ secrets.CSC_KEY_PASSWORD }}
       APPLE_ID: ${{ secrets.APPLE_ID }}
       APPLE_APP_SPECIFIC_PASSWORD: ${{ secrets.APPLE_APP_SPECIFIC_PASSWORD }}
       APPLE_TEAM_ID: ${{ secrets.APPLE_TEAM_ID }}
   ```

## 手动触发构建

1. 进入 GitHub 仓库的 `Actions` 页面
2. 选择 `Build and Release` 工作流
3. 点击 `Run workflow` 按钮
4. 选择分支并点击 `Run workflow`

## 查看构建结果

1. 进入 `Actions` 页面查看构建进度
2. 构建完成后，可以在 `Artifacts` 中下载安装包
3. 如果是标签触发的构建，会自动创建 GitHub Release（草稿状态）

## 故障排查

### 构建失败
- 检查 `Actions` 页面的日志输出
- 确认 `package.json` 中的依赖版本正确
- 确认 Node.js 和 pnpm 版本匹配

### macOS 构建失败
- 如果是代码签名问题，可以暂时禁用签名（已在配置中禁用）
- 检查 `build/entitlements.mac.plist` 文件是否存在

### Windows 构建失败
- 检查 `build/icon.ico` 文件是否存在
- 检查 `build/installer.nsh` 文件是否存在

## 本地测试

在推送到 GitHub 之前，建议先在本地测试构建：

```bash
# Windows
pnpm run package:win:x64

# macOS（需要在 Mac 上运行）
pnpm run package
```
