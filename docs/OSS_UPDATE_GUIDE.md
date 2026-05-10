# OSS 更新配置指南

本文档说明如何配置和使用阿里云 OSS 作为应用更新源。

## 一、配置 OSS

### 1. 创建 Bucket

1. 登录阿里云控制台 → 对象存储 OSS
2. 创建 Bucket
   - 名称：`petbuddy-releases`（或自定义）
   - 区域：选择国内区域（如华东-杭州）
   - 读写权限：**公共读**（重要！）
   - 其他保持默认

### 2. 获取访问凭证

1. 进入 AccessKey 管理（右上角头像 → AccessKey 管理）
2. 创建 AccessKey
3. 记录 `AccessKeyId` 和 `AccessKeySecret`（仅显示一次）

### 3. 记录 Endpoint

在 Bucket 概览页面找到 Endpoint，格式如：
- `oss-cn-hangzhou.aliyuncs.com`（杭州）
- `oss-cn-beijing.aliyuncs.com`（北京）
- `oss-cn-shanghai.aliyuncs.com`（上海）

## 二、配置环境变量

### Windows PowerShell

```powershell
# 设置 OSS 配置
$env:OSS_ACCESS_KEY_ID="your-access-key-id"
$env:OSS_ACCESS_KEY_SECRET="your-access-key-secret"
$env:OSS_REGION="oss-cn-hangzhou"
$env:OSS_BUCKET="petbuddy-releases"

# 设置更新源为 CDN
$env:UPDATE_SOURCE="cdn"
```

### macOS/Linux

```bash
export OSS_ACCESS_KEY_ID="your-access-key-id"
export OSS_ACCESS_KEY_SECRET="your-access-key-secret"
export OSS_REGION="oss-cn-hangzhou"
export OSS_BUCKET="petbuddy-releases"
export UPDATE_SOURCE="cdn"
```

### 永久配置（推荐）

创建 `.env` 文件（已在 .gitignore 中）：

```env
OSS_ACCESS_KEY_ID=your-access-key-id
OSS_ACCESS_KEY_SECRET=your-access-key-secret
OSS_REGION=oss-cn-hangzhou
OSS_BUCKET=petbuddy-releases
UPDATE_SOURCE=cdn
```

## 三、发布流程

### 1. 构建应用

```bash
# Windows
pnpm run package:win

# macOS
pnpm run package
```

### 2. 上传到 OSS

```bash
# 上传指定版本
pnpm run upload:oss v0.2.0

# 或直接使用脚本
node scripts/upload-to-oss.mjs v0.2.0
```

上传成功后会显示：
```
✅ 上传成功: v0.2.0/PetBuddy-Setup-0.2.0.exe
✅ 上传成功: latest.yml

🔗 访问地址：
   https://petbuddy-releases.oss-cn-hangzhou.aliyuncs.com/latest.yml
   https://petbuddy-releases.oss-cn-hangzhou.aliyuncs.com/v0.2.0/
```

### 3. 验证更新

1. 访问 `https://your-bucket.oss-region.aliyuncs.com/latest.yml`
2. 确认文件可访问且内容正确
3. 运行应用，测试更新功能

## 四、更新源切换

### 使用 CDN（国内用户）

```bash
$env:UPDATE_SOURCE="cdn"
```

应用会从 OSS 检查和下载更新。

### 使用 GitHub（国外用户）

```bash
$env:UPDATE_SOURCE="github"
```

应用会从 GitHub Releases 检查和下载更新。

## 五、目录结构

OSS Bucket 中的文件结构：

```
petbuddy-releases/
├── latest.yml              # Windows 最新版本信息
├── latest-mac.yml          # macOS 最新版本信息
├── v0.2.0/
│   ├── PetBuddy-Setup-0.2.0.exe
│   ├── PetBuddy-0.2.0-arm64.dmg
│   └── PetBuddy-0.2.0-arm64-mac.zip
├── v0.2.1/
│   └── ...
```

## 六、成本估算

以 100 个活跃用户为例：

- **存储**：每版本 100MB，保留 10 版本 = 1GB
  - 成本：1GB × 0.12元/月 = **0.12元/月**
  
- **流量**：100 用户 × 100MB × 20% 更新率 = 2GB
  - 成本：2GB × 0.5元 = **1元/月**

- **总计**：约 **1.2元/月**

## 七、常见问题

### Q1: 上传失败，提示权限错误

**A:** 检查：
1. AccessKey 是否正确
2. Bucket 权限是否为"公共读"
3. AccessKey 是否有 OSS 操作权限

### Q2: 应用检查更新失败

**A:** 检查：
1. `latest.yml` 是否上传成功
2. Bucket 是否设置为"公共读"
3. 环境变量 `UPDATE_SOURCE` 是否设置为 "cdn"
4. OSS URL 是否正确

### Q3: 如何清理旧版本

**A:** 在 OSS 控制台手动删除旧版本目录，或使用生命周期规则自动清理。

### Q4: 能否使用自定义域名

**A:** 可以！在 OSS 控制台绑定自定义域名，然后修改环境变量：
```bash
$env:OSS_BUCKET="releases.petbuddy.com"
$env:OSS_REGION=""  # 使用自定义域名时留空
```

## 八、安全建议

1. ⚠️ **不要**将 AccessKey 提交到 Git
2. ✅ 使用环境变量或 `.env` 文件存储密钥
3. ✅ 定期轮换 AccessKey
4. ✅ 为 AccessKey 设置最小权限（仅 OSS 操作）
5. ✅ 开启 OSS 访问日志监控异常流量

## 九、进阶配置

### 自动选择最佳源

未来可以实现：
1. 检测用户网络环境
2. 自动选择最快的更新源
3. 主源失败时自动切换备用源

### CDN 加速

为 OSS 绑定 CDN 域名，进一步提升访问速度。

### 增量更新

配置 electron-updater 的增量更新功能，减少下载量。
