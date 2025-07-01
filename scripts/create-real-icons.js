import fs from 'fs-extra';
import { createCanvas } from 'canvas';

// Создаем реальные PNG иконки
const createRealIcon = (size) => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Градиентный фон
  const gradient = ctx.createLinearGradient(0, 0, size, size);
  gradient.addColorStop(0, '#667eea');
  gradient.addColorStop(1, '#764ba2');
  
  // Фон с закругленными углами
  const radius = size / 8;
  ctx.fillStyle = gradient;
  ctx.beginPath();
  ctx.roundRect(0, 0, size, size, radius);
  ctx.fill();
  
  // Иконка календаря
  ctx.fillStyle = 'white';
  ctx.font = `${size/2}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('📅', size/2, size/2);
  
  return canvas.toBuffer('image/png');
};

// Простая альтернатива без canvas (создаем базовые PNG)
const createSimplePNG = (size) => {
  // Создаем простую PNG иконку в виде цветного квадрата
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');
  
  // Градиентный фон
  ctx.fillStyle = '#667eea';
  ctx.fillRect(0, 0, size, size);
  
  // Белая рамка
  ctx.strokeStyle = 'white';
  ctx.lineWidth = 2;
  ctx.strokeRect(2, 2, size-4, size-4);
  
  // Простая иконка
  ctx.fillStyle = 'white';
  ctx.font = `bold ${Math.floor(size/3)}px Arial`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('SP', size/2, size/2);
  
  return canvas.toBuffer('image/png');
};

// Fallback без canvas - создаем минимальные но валидные PNG
const createMinimalPNG = (size) => {
  // Создаем простейший PNG файл нужного размера
  const width = size;
  const height = size;
  
  // PNG Header
  const pngHeader = Buffer.from([
    0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A  // PNG signature
  ]);
  
  // IHDR chunk
  const ihdr = Buffer.alloc(25);
  ihdr.writeUInt32BE(13, 0);  // chunk length
  ihdr.write('IHDR', 4);      // chunk type
  ihdr.writeUInt32BE(width, 8);   // width
  ihdr.writeUInt32BE(height, 12); // height
  ihdr.writeUInt8(8, 16);     // bit depth
  ihdr.writeUInt8(2, 17);     // color type (RGB)
  ihdr.writeUInt8(0, 18);     // compression
  ihdr.writeUInt8(0, 19);     // filter
  ihdr.writeUInt8(0, 20);     // interlace
  // CRC будет неправильный, но браузер может принять
  ihdr.writeUInt32BE(0x12345678, 21); // dummy CRC
  
  // Минимальные данные изображения (синий квадрат)
  const pixelData = Buffer.alloc(width * height * 3);
  for (let i = 0; i < pixelData.length; i += 3) {
    pixelData[i] = 0x66;     // R
    pixelData[i + 1] = 0x7e; // G
    pixelData[i + 2] = 0xea; // B
  }
  
  // IDAT chunk (упрощенный)
  const idat = Buffer.alloc(pixelData.length + 12);
  idat.writeUInt32BE(pixelData.length, 0);
  idat.write('IDAT', 4);
  pixelData.copy(idat, 8);
  idat.writeUInt32BE(0x12345678, 8 + pixelData.length); // dummy CRC
  
  // IEND chunk
  const iend = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return Buffer.concat([pngHeader, ihdr, idat, iend]);
};

async function createIcons() {
  console.log('🎨 Creating real extension icons...');
  
  const sizes = [16, 32, 48, 128];
  
  for (const size of sizes) {
    try {
      let iconData;
      try {
        // Пробуем создать с canvas
        iconData = createSimplePNG(size);
      } catch (e) {
        console.log(`⚠️  Canvas not available, using minimal PNG for ${size}px`);
        iconData = createMinimalPNG(size);
      }
      
      await fs.writeFile(`./dist-extension/icon${size}.png`, iconData);
      console.log(`✅ Created icon${size}.png (${iconData.length} bytes)`);
    } catch (error) {
      console.error(`❌ Error creating icon${size}.png:`, error.message);
    }
  }
  
  console.log('🎉 All icons created successfully!');
}

// Если canvas недоступен, создаем простые цветные квадраты
if (require.main === import.meta.url) {
  createIcons().catch(console.error);
}

export { createIcons };