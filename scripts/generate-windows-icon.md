# 生成 Windows 图标指南

在构建 Windows 版本之前，需要将 `build/icon.png` 转换为 `build/icon.ico` 格式。

## 方法 1：使用在线工具（推荐，最简单）

1. 访问 https://convertio.co/png-ico/ 或 https://www.icoconverter.com/
2. 上传 `build/icon.png`
3. 选择输出格式为 ICO
4. 确保包含多个尺寸：256x256, 128x128, 64x64, 48x48, 32x32, 16x16
5. 下载生成的 `icon.ico`
6. 将文件保存到 `build/icon.ico`

## 方法 2：使用 ImageMagick（命令行）

### 安装 ImageMagick

**Windows:**
```bash
# 使用 Chocolatey
choco install imagemagick

# 或从官网下载安装
# https://imagemagick.org/script/download.php#windows
```

**macOS:**
```bash
brew install imagemagick
```

**Linux:**
```bash
sudo apt-get install imagemagick  # Ubuntu/Debian
sudo yum install imagemagick      # CentOS/RHEL
```

### 转换命令

```bash
# 在项目根目录执行
convert build/icon.png -define icon:auto-resize=256,128,64,48,32,16 build/icon.ico
```

## 方法 3：使用 Node.js 包

### 安装依赖
```bash
pnpm add -D png-to-ico
```

### 创建转换脚本
创建 `scripts/convert-icon.js`:

```javascript
import fs from 'fs';
import pngToIco from 'png-to-ico';

pngToIco('build/icon.png')
  .then(buf => {
    fs.writeFileSync('build/icon.ico', buf);
    console.log('✓ Windows icon generated successfully!');
  })
  .catch(err => {
    console.error('✗ Failed to generate icon:', err);
    process.exit(1);
  });
```

### 运行脚本
```bash
node scripts/convert-icon.js
```

## 验证图标

生成后，可以通过以下方式验证：

1. **Windows 资源管理器**：右键点击 `icon.ico`，查看属性，确认包含多个尺寸
2. **在线工具**：上传到 https://www.icoconverter.com/ 查看包含的尺寸
3. **ImageMagick**：
   ```bash
   identify build/icon.ico
   ```

## 图标要求

- 格式：ICO
- 推荐包含的尺寸：
  - 256x256 (Windows 10/11 大图标)
  - 128x128
  - 64x64
  - 48x48 (Windows 资源管理器)
  - 32x32 (任务栏)
  - 16x16 (小图标)
- 背景：建议使用透明背景

## 注意事项

1. 确保原始 PNG 图标质量足够高（至少 256x256）
2. ICO 文件应该包含多个尺寸以适应不同场景
3. 生成后的 `icon.ico` 文件应该提交到 Git 仓库
4. 如果图标更新，记得重新生成 ICO 文件
