#!/bin/bash

# macOS 代码签名验证脚本

set -e

APP_PATH="release/mac-arm64/PetBuddy.app"

if [ ! -d "$APP_PATH" ]; then
  echo "❌ 找不到应用: $APP_PATH"
  echo "请先运行: pnpm package"
  exit 1
fi

echo "🔍 验证 macOS 应用签名..."
echo ""

echo "1️⃣ 查看签名信息:"
codesign -dv --verbose=4 "$APP_PATH" 2>&1 || true
echo ""

echo "2️⃣ 验证签名完整性:"
if codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
  echo "✅ 签名验证通过"
else
  echo "⚠️  签名验证失败（ad-hoc 签名可能会显示警告，这是正常的）"
fi
echo ""

echo "3️⃣ 检查 Gatekeeper 状态:"
if spctl -a -t exec -vv "$APP_PATH" 2>&1; then
  echo "✅ Gatekeeper 验证通过"
else
  echo "⚠️  Gatekeeper 验证失败（ad-hoc 签名预期会失败）"
  echo "   用户首次安装时需要右键点击 -> 打开"
fi
echo ""

echo "4️⃣ 检查加固运行时:"
if codesign -dv --verbose=4 "$APP_PATH" 2>&1 | grep -q "runtime"; then
  echo "✅ 已启用加固运行时 (Hardened Runtime)"
else
  echo "⚠️  未启用加固运行时"
fi
echo ""

echo "5️⃣ 检查 entitlements:"
codesign -d --entitlements - "$APP_PATH" 2>&1 || true
echo ""

echo "✅ 验证完成"
