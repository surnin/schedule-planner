import { build } from 'vite';
import fs from 'fs-extra';
import path from 'path';

async function buildExtension() {
  try {
    console.log('🔨 Building Chrome Extension...');
    
    // Сборка с Vite
    await build({
      mode: 'production',
      build: {
        outDir: 'dist-extension',
        emptyOutDir: true
      }
    });
    
    // Копируем manifest.json в папку dist-extension
    await fs.copy('./manifest.json', './dist-extension/manifest.json');
    
    // Создаем базовые иконки если их нет
    const iconsDir = './dist-extension/public';
    await fs.ensureDir(iconsDir);
    
    console.log('✅ Chrome Extension build completed!');
    console.log('📁 Extension files are in ./dist-extension/');
    console.log('📋 To install:');
    console.log('   1. Open Chrome -> Extensions -> Developer mode');
    console.log('   2. Click "Load unpacked"');
    console.log('   3. Select the ./dist-extension/ folder');
    
  } catch (error) {
    console.error('❌ Build failed:', error);
    process.exit(1);
  }
}

buildExtension();