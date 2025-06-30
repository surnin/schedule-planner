import fs from 'fs-extra';

// Создаем простые base64 PNG иконки
const createSimpleIcon = (size) => {
  // Простая PNG иконка в base64 (квадрат с градиентом)
  const canvas = `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea"/>
        <stop offset="100%" style="stop-color:#764ba2"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size/8}"/>
    <text x="50%" y="60%" text-anchor="middle" fill="white" font-family="Arial" font-size="${size/4}" font-weight="bold">📅</text>
  </svg>`;
  
  return `data:image/svg+xml;base64,${Buffer.from(canvas).toString('base64')}`;
};

// Создаем простые PNG файлы (заглушки)
const createPngIcon = (size) => {
  // Минимальный PNG header для прозрачного квадрата
  return Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, // PNG signature
    0x00, 0x00, 0x00, 0x0D, 0x49, 0x48, 0x44, 0x52, // IHDR chunk
    0x00, 0x00, 0x00, size, 0x00, 0x00, 0x00, size, // width, height
    0x08, 0x06, 0x00, 0x00, 0x00, // bit depth, color type, etc.
    0x00, 0x00, 0x00, 0x00, 0x49, 0x45, 0x4E, 0x44, 0xAE, 0x42, 0x60, 0x82 // minimal end
  ]);
};

async function createIcons() {
  console.log('🎨 Creating simple extension icons...');
  
  const sizes = [16, 32, 48, 128];
  const publicDir = './public';
  
  await fs.ensureDir(publicDir);
  
  for (const size of sizes) {
    const iconData = createPngIcon(size);
    await fs.writeFile(`${publicDir}/icon${size}.png`, iconData);
    console.log(`✅ Created icon${size}.png`);
  }
  
  console.log('🎉 All icons created successfully!');
}

createIcons().catch(console.error);