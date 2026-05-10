#!/usr/bin/env node
import sharp from 'sharp';
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const projectRoot = join(__dirname, '..');

// 读取原始 PNG 图标
const iconPath = join(projectRoot, 'build/icon.png');
const iconBuffer = readFileSync(iconPath);

// 生成 16x16 的托盘图标（Windows 标准）
const trayIcon16 = await sharp(iconBuffer)
  .resize(16, 16, {
    kernel: sharp.kernel.lanczos3,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toBuffer();

writeFileSync(join(projectRoot, 'build/tray-icon-16.png'), trayIcon16);
console.log('✅ Generated build/tray-icon-16.png');

// 生成 32x32 的托盘图标（高 DPI 显示器）
const trayIcon32 = await sharp(iconBuffer)
  .resize(32, 32, {
    kernel: sharp.kernel.lanczos3,
    fit: 'contain',
    background: { r: 0, g: 0, b: 0, alpha: 0 }
  })
  .png()
  .toBuffer();

writeFileSync(join(projectRoot, 'build/tray-icon-32.png'), trayIcon32);
console.log('✅ Generated build/tray-icon-32.png');
