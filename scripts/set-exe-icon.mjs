#!/usr/bin/env node
import { rcedit } from 'rcedit';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const exePath = path.join(__dirname, '../dist/win-unpacked/PetBuddy.exe');
const iconPath = path.join(__dirname, '../build/icon.ico');

console.log('🔧 Setting icon for PetBuddy.exe...');
console.log(`   EXE: ${exePath}`);
console.log(`   Icon: ${iconPath}`);

try {
  await rcedit(exePath, {
    icon: iconPath
  });
  console.log('✅ Icon set successfully!');
} catch (error) {
  console.error('❌ Error setting icon:', error);
  process.exit(1);
}
