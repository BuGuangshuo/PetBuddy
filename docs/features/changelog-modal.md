# 更新日志弹窗功能

## 功能描述

当用户第一次打开系统设置面板或更新版本后打开设置面板时，会自动弹出一个更新日志弹窗，展示**当前版本**的更新内容（不包含历史版本）。

## 实现细节

### 1. 数据模型更新

在 `AppSettings` 接口中添加了新字段：
- `lastViewedChangelogVersion: string | null` - 记录用户上次查看更新日志的版本号

### 2. API 扩展

添加了新的 API 方法：
- `window.petBuddy.changelog.getContent()` - 从主进程读取当前版本的更新日志内容
- `window.petBuddy.changelog.getDecorationGif()` - 获取装饰性 GIF 图片的 URL

### 3. 主进程实现

在 `src/main/index.ts` 中：
- `getChangelogContent` 处理器：
  - 读取 `USER_CHANGELOG.md` 文件
  - 使用正则表达式提取当前版本的更新内容
  - 如果找不到当前版本，返回第一个版本的内容
- `getChangelogDecorationGif` 处理器：
  - 读取 `pet_assets/ChangeLogModal` 目录
  - 返回第一个 GIF 文件的 `petbuddy-asset://` 协议 URL

### 4. 渲染进程实现

在 `src/renderer/src/settings-main.tsx` 中：
- 添加了 `showChangelog`、`changelogContent` 和 `decorationGifUrl` 状态
- 在 `load()` 函数中检查版本变化
- 实现了 `parseChangelog()` 函数来解析 markdown 格式的更新日志：
  - 识别章节标题（### 开头）
  - 提取列表项（- 开头或 ** 包裹）
  - 返回结构化的数据供 React 渲染
- 用户关闭弹窗时，更新 `lastViewedChangelogVersion` 为当前版本

### 5. UI 组件

更新日志弹窗组件包含：
- **遮罩层**：半透明黑色背景，点击可关闭
- **模态框**：
  - 标题栏：显示"🎉 更新啦！"和版本号
  - 装饰区域：显示来自 `pet_assets/ChangeLogModal` 的 GIF 动画
  - 内容区域：按章节展示更新内容
    - 每个章节有标题和列表项
    - 使用卡片式设计，左侧有蓝色边框
  - 底部按钮："我知道了"

### 6. 样式设计

在 `src/renderer/src/styles.css` 中：
- 使用渐变背景和圆角设计
- 添加淡入和上滑动画效果
- 章节卡片使用浅色背景和蓝色强调色
- 列表项使用蓝色圆点标记
- 响应式设计，最大高度 85vh，内容可滚动

### 7. 版本内容提取

使用正则表达式从 `USER_CHANGELOG.md` 中提取当前版本的内容：
```javascript
const versionPattern = new RegExp(`## 🎉 v${currentVersion.replace(/\./g, '\\.')}[\\s\\S]*?(?=\\n## |$)`, 'i');
```
这确保只显示当前版本的更新内容，不会显示历史版本。

### 8. 构建配置

在 `package.json` 的 `build.files` 中添加了：
- `USER_CHANGELOG.md` - 更新日志文件
- `pet_assets/**/*` - 包含装饰 GIF（已存在）

## 使用流程

1. 用户打开设置面板
2. 系统检查 `lastViewedChangelogVersion` 是否为空或与当前版本不同
3. 如果需要显示：
   - 从主进程读取当前版本的更新日志内容
   - 从主进程获取装饰 GIF 的 URL
4. 显示更新日志弹窗，包含：
   - 装饰性 GIF 动画
   - 当前版本的更新内容（结构化展示）
5. 用户点击"我知道了"按钮关闭弹窗
6. 系统更新 `lastViewedChangelogVersion` 为当前版本
7. 下次打开设置面板时，如果版本未变化，则不再显示弹窗

## Markdown 解析

`parseChangelog()` 函数将 markdown 格式转换为结构化数据：
- 跳过版本标题行（`## 🎉` 开头）
- 识别章节标题（`### ` 开头）
- 提取列表项（`-` 或 `**` 标记）
- 返回 `{ title: string; items: string[] }[]` 结构

## 装饰 GIF

- 位置：`pet_assets/ChangeLogModal/` 目录
- 格式：GIF 动画
- 加载：通过 `petbuddy-asset://` 协议加载
- 显示：居中显示，最大宽度 200px

## 测试

所有相关的测试文件已更新，添加了 `lastViewedChangelogVersion: null` 字段以满足类型要求。

## 注意事项

- 更新日志内容来自 `USER_CHANGELOG.md` 文件
- **只显示当前版本的更新内容**，不包含历史版本
- 弹窗只在版本变化时显示一次
- 用户可以通过点击遮罩层或关闭按钮关闭弹窗
- 关闭弹窗后会自动记录当前版本，避免重复显示
- 装饰 GIF 如果加载失败不会影响弹窗显示
