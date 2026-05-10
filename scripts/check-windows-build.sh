#!/bin/bash

# Windows 构建检查脚本
# 用于验证 Windows 构建所需的所有文件和配置

echo "🔍 检查 Windows 构建配置..."
echo ""

# 检查必需文件
echo "📁 检查必需文件..."
files_ok=true

if [ ! -f "build/icon.png" ]; then
  echo "❌ build/icon.png 不存在"
  files_ok=false
else
  echo "✅ build/icon.png 存在"
fi

if [ ! -f "build/icon.ico" ]; then
  echo "⚠️  build/icon.ico 不存在（需要生成）"
  echo "   请参考: scripts/generate-windows-icon.md"
  files_ok=false
else
  echo "✅ build/icon.ico 存在"
fi

if [ ! -f "package.json" ]; then
  echo "❌ package.json 不存在"
  files_ok=false
else
  echo "✅ package.json 存在"
fi

echo ""

# 检查 package.json 配置
echo "⚙️  检查 package.json 配置..."
config_ok=true

if ! grep -q '"package:win"' package.json; then
  echo "❌ package.json 缺少 package:win 脚本"
  config_ok=false
else
  echo "✅ package:win 脚本已配置"
fi

if ! grep -q '"win":' package.json; then
  echo "❌ package.json 缺少 win 构建配置"
  config_ok=false
else
  echo "✅ win 构建配置已添加"
fi

if ! grep -q '"nsis":' package.json; then
  echo "❌ package.json 缺少 nsis 配置"
  config_ok=false
else
  echo "✅ nsis 配置已添加"
fi

echo ""

# 检查依赖
echo "📦 检查依赖..."
deps_ok=true

if [ ! -d "node_modules" ]; then
  echo "⚠️  node_modules 不存在，请运行: pnpm install"
  deps_ok=false
else
  echo "✅ node_modules 存在"
fi

if [ ! -f "node_modules/electron-builder/package.json" ]; then
  echo "❌ electron-builder 未安装"
  deps_ok=false
else
  echo "✅ electron-builder 已安装"
fi

echo ""

# 检查文档
echo "📚 检查文档..."
docs_ok=true

if [ ! -f "docs/windows-support.md" ]; then
  echo "❌ docs/windows-support.md 不存在"
  docs_ok=false
else
  echo "✅ docs/windows-support.md 存在"
fi

if [ ! -f "docs/windows-quick-start.md" ]; then
  echo "❌ docs/windows-quick-start.md 不存在"
  docs_ok=false
else
  echo "✅ docs/windows-quick-start.md 存在"
fi

echo ""

# 总结
echo "📊 检查总结"
echo "============"

all_ok=true

if [ "$files_ok" = true ]; then
  echo "✅ 文件检查通过"
else
  echo "❌ 文件检查失败"
  all_ok=false
fi

if [ "$config_ok" = true ]; then
  echo "✅ 配置检查通过"
else
  echo "❌ 配置检查失败"
  all_ok=false
fi

if [ "$deps_ok" = true ]; then
  echo "✅ 依赖检查通过"
else
  echo "❌ 依赖检查失败"
  all_ok=false
fi

if [ "$docs_ok" = true ]; then
  echo "✅ 文档检查通过"
else
  echo "❌ 文档检查失败"
  all_ok=false
fi

echo ""

if [ "$all_ok" = true ]; then
  echo "🎉 所有检查通过！"
  echo ""
  echo "下一步："
  if [ ! -f "build/icon.ico" ]; then
    echo "1. 生成 Windows 图标: 参考 scripts/generate-windows-icon.md"
    echo "2. 运行构建: pnpm package:win"
  else
    echo "1. 运行构建: pnpm package:win"
    echo "2. 在 Windows 上测试构建产物"
  fi
else
  echo "⚠️  存在问题需要修复"
  echo ""
  echo "请根据上面的错误信息进行修复"
fi

echo ""
