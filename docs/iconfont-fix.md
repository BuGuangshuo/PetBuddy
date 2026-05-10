# Iconfont 图标不显示问题修复

## 问题描述

在正式版（打包后）的软件中，iconfont 图标无法显示。

## 问题原因

原代码在 HTML 文件中使用了 CDN 引用：

```html
<script src="//at.alicdn.com/t/c/font_5174937_ozryvqndwy.js"></script>
```

这个 CDN 链接使用的是 `//` 协议（protocol-relative URL），在浏览器中会自动使用 `https://`，但在 Electron 打包后的应用中，这个协议会被解析为 `file://`，导致无法加载外部资源。

## 解决方案

将 iconfont 文件下载到本地，并在项目中直接引用：

### 1. 下载 iconfont 文件

```bash
curl -o src/renderer/src/iconfont.js https://at.alicdn.com/t/c/font_5174937_ozryvqndwy.js
```

### 2. 移除 HTML 中的 CDN 引用

修改 `src/renderer/settings.html` 和 `src/renderer/pet.html`，删除：

```html
<script src="//at.alicdn.com/t/c/font_5174937_ozryvqndwy.js"></script>
```

### 3. 在 TypeScript 中导入本地文件

在 `src/renderer/src/settings-main.tsx` 中添加：

```typescript
import "./iconfont.js";
```

## 验证

构建项目后，检查构建输出：

```bash
npm run build
```

在 `out/renderer/assets/settings-*.js` 中应该能看到 `_iconfont_svg_string_5174937` 的内容，说明 iconfont 已经被成功打包。

## 优点

1. **离线可用**：不依赖网络连接
2. **加载更快**：本地文件加载速度更快
3. **更稳定**：不受 CDN 服务状态影响
4. **安全性更高**：避免外部资源加载的安全风险

## 相关文件

- `src/renderer/src/iconfont.js` - 本地 iconfont 文件
- `src/renderer/settings.html` - 设置页面 HTML
- `src/renderer/pet.html` - 宠物页面 HTML
- `src/renderer/src/settings-main.tsx` - 设置页面主文件
