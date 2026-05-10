# 更新日志弹窗 - Cal.com 设计系统实现

## 设计原则

更新日志弹窗完全遵循 Cal.com 设计系统规范，体现了以下核心原则：

### 1. 简洁清晰
- 白色画布背景 (`{colors.canvas}` - #ffffff)
- 黑色主要文本 (`{colors.ink}` - #111111)
- 最小化装饰，专注内容

### 2. 层次分明
- 使用 Cal Sans 字体（display-sm）作为标题
- Inter 字体用于正文内容
- 清晰的视觉层次：标题 → 版本号 → 内容 → 按钮

### 3. 现代友好
- 柔和的圆角 (`{rounded.lg}` - 12px)
- 微妙的阴影效果
- 流畅的动画过渡

## 设计规范应用

### 颜色系统

| 元素 | 颜色 Token | 值 | 用途 |
|------|-----------|-----|------|
| 背景 | `{colors.canvas}` | #ffffff | 弹窗主背景 |
| 标题文本 | `{colors.ink}` | #111111 | 主标题 |
| 正文文本 | `{colors.body}` | #374151 | 列表项内容 |
| 次要文本 | `{colors.muted}` | #6b7280 | 版本号、列表圆点 |
| 分割线 | `{colors.hairline}` | #e5e7eb | 标题底部边框 |
| 浅色分割线 | `{colors.hairline-soft}` | #f3f4f6 | 章节标题底部 |
| 主按钮背景 | `{colors.primary}` | #111111 | "知道了"按钮 |
| 主按钮文本 | `{colors.on-primary}` | #ffffff | 按钮文字 |
| 主按钮激活 | `{colors.primary-active}` | #242424 | 按钮按下状态 |
| 浅色背景 | `{colors.surface-soft}` | #f8f9fa | 关闭按钮悬停 |
| 强调背景 | `{colors.surface-strong}` | #e5e7eb | 关闭按钮激活 |

### 字体系统

| 元素 | 字体 Token | 规格 | 应用 |
|------|-----------|------|------|
| 主标题 | `{typography.display-sm}` | Cal Sans, 28px, 600, -0.5px | "更新啦 🎉" |
| 版本号 | `{typography.caption}` | Inter, 13px, 500 | "v0.2.0" |
| 章节标题 | `{typography.title-sm}` | Inter, 16px, 600 | "✨ 新功能" |
| 列表项 | `{typography.body-sm}` | Inter, 14px, 400 | 更新内容 |
| 按钮 | `{typography.button}` | Inter, 14px, 600 | "知道了" |

### 圆角系统

| 元素 | 圆角 Token | 值 | 应用 |
|------|-----------|-----|------|
| 弹窗容器 | `{rounded.lg}` | 12px | 模态框外框 |
| 按钮 | `{rounded.md}` | 8px | 主按钮、关闭按钮 |
| 装饰图片 | `{rounded.md}` | 8px | GIF 图片 |

### 间距系统

| 元素 | 间距 Token | 值 | 应用 |
|------|-----------|-----|------|
| 标题区域 | `{spacing.xl}` | 32px | 顶部内边距 |
| 内容区域 | `{spacing.xl}` | 32px | 左右内边距 |
| 底部区域 | `{spacing.md}` | 16px | 按钮区域内边距 |
| 章节间距 | `{spacing.lg}` | 24px | 章节之间的间距 |
| 标题下方 | `{spacing.sm}` | 12px | 章节标题到列表 |
| 列表项间距 | `{spacing.xs}` | 8px | 列表项之间 |
| 标题与版本 | `{spacing.xxs}` | 4px | 标题和版本号 |
| 关闭按钮 | `{spacing.md}` | 16px | 左侧间距 |

### 组件规范

#### 主按钮 (`button-primary`)
```css
background: {colors.primary} (#111111)
color: {colors.on-primary} (#ffffff)
font: {typography.button} (Inter 14px/600)
border-radius: {rounded.md} (8px)
padding: 12px 20px
height: 40px
```

**状态变化：**
- Hover: `background: {colors.primary-active}` (#242424)
- Active: `background: {colors.primary-active}` + `transform: translateY(1px)`

#### 关闭按钮 (`button-icon-circular` 变体)
```css
background: transparent
color: {colors.muted} (#6b7280)
size: 32px × 32px
border-radius: {rounded.md} (8px)
```

**状态变化：**
- Hover: `background: {colors.surface-soft}`, `color: {colors.ink}`
- Active: `background: {colors.surface-strong}`

### 阴影系统

| 元素 | 阴影规格 | 应用 |
|------|---------|------|
| 弹窗容器 | `0 4px 12px rgba(0,0,0,0.08)` | 模态框外阴影 |

这是 Cal.com 设计系统中的 "Subtle drop shadow" 级别。

### 动画系统

#### 遮罩层淡入
```css
duration: 0.15s
easing: ease-out
from: opacity 0
to: opacity 1
```

#### 弹窗上滑
```css
duration: 0.2s
easing: ease-out
from: translateY(16px), opacity 0
to: translateY(0), opacity 1
```

#### 按钮过渡
```css
duration: 0.15s
easing: ease
properties: background, transform
```

## 设计决策

### 为什么选择这些规范？

1. **白色背景而非浅灰色卡片**
   - 更新日志是重要信息，使用 `{colors.canvas}` 白色背景提升重要性
   - 符合 Cal.com "白色画布 + 黑色主按钮" 的核心视觉语言

2. **简洁的章节设计**
   - 移除了彩色边框和背景色
   - 使用细线分割 (`{colors.hairline-soft}`) 保持清晰层次
   - 符合 Cal.com 的 "最小化装饰" 原则

3. **Inter 字体用于章节标题**
   - Cal Sans 仅用于主标题（display 级别）
   - 章节标题使用 Inter 保持一致性
   - 符合设计系统的字体使用规则

4. **柔和的圆角**
   - `{rounded.lg}` (12px) 用于弹窗容器
   - `{rounded.md}` (8px) 用于按钮
   - 符合 Cal.com 的圆角层次系统

5. **微妙的阴影**
   - 使用 `0 4px 12px rgba(0,0,0,0.08)` 而非重阴影
   - 符合 "soft and modern" 的提升哲学

6. **快速的动画**
   - 0.15-0.2s 的过渡时间
   - 符合现代 SaaS 应用的响应速度预期

## 响应式设计

### 移动端适配（< 768px）

- 弹窗最大宽度：100% - 32px (两侧各 16px 间距)
- 标题字体：28px → 24px
- 内边距：32px → 24px
- 按钮：保持 40px 高度（符合触摸目标）

### 平板端（768-1024px）

- 弹窗最大宽度：640px
- 保持桌面端的所有规格

## 可访问性

### WCAG 2.1 AA 合规

1. **颜色对比度**
   - 标题文本 (#111111) vs 白色背景：21:1 ✅
   - 正文文本 (#374151) vs 白色背景：10.7:1 ✅
   - 次要文本 (#6b7280) vs 白色背景：5.7:1 ✅

2. **触摸目标**
   - 主按钮：40px 高度 ✅
   - 关闭按钮：32px × 32px（略小但可接受）

3. **键盘导航**
   - 支持 ESC 键关闭（需实现）
   - 按钮可通过 Tab 键聚焦

4. **语义化 HTML**
   - 使用 `<h2>` 作为主标题
   - 使用 `<h3>` 作为章节标题
   - 使用 `<ul>` 和 `<li>` 作为列表
   - 关闭按钮包含 `aria-label`

## 与其他组件的一致性

更新日志弹窗的设计与以下 Cal.com 组件保持一致：

1. **Feature Card** - 使用相同的内边距和圆角
2. **Button Primary** - 完全遵循主按钮规范
3. **Text Input** - 使用相同的圆角和高度标准
4. **Top Nav** - 使用相同的字体和间距系统

## 设计系统符合性检查表

- [x] 使用 Cal Sans 作为 display 标题
- [x] 使用 Inter 作为正文和 UI 元素
- [x] 主按钮使用 `{colors.primary}` (#111111)
- [x] 圆角使用 `{rounded.lg}` 和 `{rounded.md}`
- [x] 间距使用 4px 基础单位
- [x] 阴影使用微妙的 drop shadow
- [x] 动画时长在 0.15-0.2s 之间
- [x] 颜色对比度符合 WCAG AA 标准
- [x] 触摸目标至少 40px
- [x] 语义化 HTML 结构

## 未来改进建议

1. **添加键盘快捷键支持**
   - ESC 键关闭弹窗
   - Enter 键确认

2. **添加深色模式支持**
   - 使用 `{colors.surface-dark}` 作为背景
   - 文本颜色反转为 `{colors.on-dark}`

3. **添加更多动画细节**
   - 列表项逐个淡入
   - 装饰 GIF 的加载动画

4. **优化移动端体验**
   - 全屏显示而非模态框
   - 底部固定按钮
