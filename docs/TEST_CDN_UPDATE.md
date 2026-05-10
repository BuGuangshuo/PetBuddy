# CDN 更新功能测试指南

本文档说明如何测试 CDN 更新功能是否正常工作。

## 前置条件

✅ 已配置 `.env` 文件  
✅ 已上传文件到 OSS  
✅ 已验证 OSS 文件可访问  

## 测试步骤

### 1. 开发环境测试

```bash
# 启动开发环境
pnpm run dev
```

应用启动后：
1. 打开设置窗口
2. 找到"关于"或"更新"部分
3. 点击"检查更新"按钮
4. 观察控制台输出

**预期结果：**
- 控制台显示：`[UpdateService] 使用 CDN 更新源: https://petbuddy-releases.oss-cn-beijing.aliyuncs.com`
- 应用能够检查更新（如果当前版本是最新的，会显示"已经是最新版本"）

### 2. 打包应用测试

```bash
# 构建并打包 Windows 版本
pnpm run package:win:x64

# 或打包 macOS 版本
pnpm run package
```

打包完成后：
1. 安装打包好的应用
2. 运行应用
3. 打开设置，点击"检查更新"

**预期结果：**
- 应用从 CDN 检查更新
- 如果有新版本，能够下载并安装

### 3. 模拟新版本测试

为了测试更新功能，你需要：

#### 步骤 A：修改版本号

编辑 `package.json`：
```json
{
  "version": "0.2.1"
}
```

#### 步骤 B：构建新版本

```bash
pnpm run package:win:x64
```

#### 步骤 C：上传到 OSS

```bash
pnpm run upload:oss v0.2.1
```

#### 步骤 D：测试旧版本更新

1. 安装 v0.2.0 版本
2. 运行应用
3. 点击"检查更新"
4. 应该提示发现新版本 v0.2.1
5. 点击下载更新
6. 下载完成后自动安装

## 验证 CDN 配置

### 检查环境变量

在开发环境中，打开 DevTools 控制台，运行：

```javascript
console.log('UPDATE_SOURCE:', process.env.UPDATE_SOURCE)
console.log('OSS_REGION:', process.env.OSS_REGION)
console.log('OSS_BUCKET:', process.env.OSS_BUCKET)
```

**预期输出：**
```
UPDATE_SOURCE: cdn
OSS_REGION: oss-cn-beijing
OSS_BUCKET: petbuddy-releases
```

### 检查更新 URL

在 `src/main/services/updateService.ts` 中添加日志：

```typescript
console.log('[UpdateService] Feed URL:', autoUpdater.getFeedURL())
```

**预期输出：**
```
[UpdateService] Feed URL: https://petbuddy-releases.oss-cn-beijing.aliyuncs.com
```

## 常见问题排查

### Q1: 检查更新时报错 "net::ERR_NAME_NOT_RESOLVED"

**原因：** OSS URL 配置错误

**解决：**
1. 检查 `.env` 文件中的 `OSS_REGION` 和 `OSS_BUCKET`
2. 确认 URL 格式：`https://{bucket}.{region}.aliyuncs.com`
3. 在浏览器中访问 `https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/latest.yml` 验证

### Q2: 检查更新时报错 "403 Forbidden"

**原因：** Bucket 权限设置错误

**解决：**
1. 登录阿里云 OSS 控制台
2. 找到你的 Bucket
3. 设置读写权限为"公共读"

### Q3: 应用仍然从 GitHub 检查更新

**原因：** 环境变量未生效

**解决：**
1. 确认 `.env` 文件中 `UPDATE_SOURCE=cdn`
2. 重新构建应用：`pnpm run build`
3. 检查 `package.json` 中的 `win.env` 和 `mac.env` 配置

### Q4: 打包后的应用无法检查更新

**原因：** 打包时环境变量未注入

**解决：**
1. 确认 `package.json` 中 `build.win.env` 和 `build.mac.env` 已配置
2. 重新打包应用

## 性能对比

### GitHub vs CDN 速度对比

你可以使用以下方法测试：

```bash
# 测试 GitHub 速度
curl -w "@curl-format.txt" -o /dev/null -s https://github.com/alanbu/PetBuddy/releases/download/v0.2.0/PetBuddy-Setup-0.2.0.exe

# 测试 CDN 速度
curl -w "@curl-format.txt" -o /dev/null -s https://petbuddy-releases.oss-cn-beijing.aliyuncs.com/v0.2.0/PetBuddy-Setup-0.2.0.exe
```

创建 `curl-format.txt`：
```
time_namelookup:  %{time_namelookup}\n
time_connect:  %{time_connect}\n
time_starttransfer:  %{time_starttransfer}\n
time_total:  %{time_total}\n
speed_download:  %{speed_download}\n
```

**预期结果：**
- CDN 下载速度应该明显快于 GitHub（特别是在国内网络环境）

## 成功标志

✅ 开发环境能够从 CDN 检查更新  
✅ 打包后的应用能够从 CDN 检查更新  
✅ 能够下载并安装新版本  
✅ 控制台显示正确的 CDN URL  
✅ 国内用户下载速度明显提升  

## 下一步

测试成功后，你可以：

1. **发布新版本**：按照正常流程发布到 GitHub Release，然后同步到 OSS
2. **监控使用情况**：在 OSS 控制台查看流量和访问统计
3. **优化成本**：根据实际使用情况调整存储策略
4. **添加 CDN 加速**：为 OSS 绑定 CDN 域名，进一步提升速度
