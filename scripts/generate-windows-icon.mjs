#!/usr/bin/env node
import pngToIco from 'png-to-ico';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '../build/icon.png');
const outputPath = path.join(__dirname, '../build/icon.ico');

console.log('🔄 Converting PNG to ICO...');
console.log(`   Input: ${inputPath}`);
console.log(`   Output: ${outputPath}`);

pngToIco(inputPath)
  .then(buf => {
    fs.writeFileSync(outputPath, buf);
    console.log('✅ icon.ico created successfully!');
    console.log(`   Size: ${(buf.length / 1024).toFixed(2)} KB`);
  })
  .catch(err => {
    console.error('❌ Error creating icon.ico:', err);
    process.exit(1);
  });
