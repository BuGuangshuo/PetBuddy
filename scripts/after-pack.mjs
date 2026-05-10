#!/usr/bin/env node
import { rcedit } from 'rcedit';
import path from 'path';

export default async function afterPack(context) {
  // 只处理 Windows 平台
  if (context.electronPlatformName !== 'win32') {
    return;
  }

  const exePath = path.join(context.appOutDir, `${context.packager.appInfo.productFilename}.exe`);
  const iconPath = path.join(context.packager.projectDir, 'build/icon.ico');

  console.log('🔧 [afterPack] Setting icon for', exePath);
  
  try {
    await rcedit(exePath, {
      icon: iconPath
    });
    console.log('✅ [afterPack] Icon set successfully!');
  } catch (error) {
    console.error('❌ [afterPack] Error setting icon:', error);
    throw error;
  }
}
