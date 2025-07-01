import fs from 'fs-extra';

// Создаем SVG иконку
const createSVGIcon = (size) => {
  return `<svg width="${size}" height="${size}" viewBox="0 0 ${size} ${size}" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" style="stop-color:#667eea"/>
        <stop offset="100%" style="stop-color:#764ba2"/>
      </linearGradient>
    </defs>
    <rect width="${size}" height="${size}" fill="url(#grad)" rx="${size/8}"/>
    <rect x="${size/6}" y="${size/4}" width="${size*2/3}" height="${size/2}" fill="white" rx="${size/16}"/>
    <rect x="${size/4}" y="${size/8}" width="${size/6}" height="${size/4}" fill="white" rx="${size/32}"/>
    <rect x="${size*7/12}" y="${size/8}" width="${size/6}" height="${size/4}" fill="white" rx="${size/32}"/>
    <text x="50%" y="70%" text-anchor="middle" fill="#667eea" font-family="Arial" font-size="${size/8}" font-weight="bold">SP</text>
  </svg>`;
};

// Создаем базовый PNG из данных (минимальный валидный файл)
const createBasicPNG = (size, color = [0x66, 0x7e, 0xea]) => {
  // Создаем простейший PNG заголовок
  const signature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  
  // IHDR chunk
  const ihdrData = Buffer.alloc(13);
  ihdrData.writeUInt32BE(size, 0);      // width
  ihdrData.writeUInt32BE(size, 4);      // height
  ihdrData.writeUInt8(8, 8);            // bit depth
  ihdrData.writeUInt8(2, 9);            // color type (RGB)
  ihdrData.writeUInt8(0, 10);           // compression
  ihdrData.writeUInt8(0, 11);           // filter
  ihdrData.writeUInt8(0, 12);           // interlace
  
  const ihdrChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, 0x0D]), // length
    Buffer.from('IHDR'),                    // type
    ihdrData,
    Buffer.from([0x5B, 0xCB, 0x6E, 0xA0])  // CRC (приблизительный)
  ]);
  
  // Создаем простые данные пикселей (одноцветный квадрат)
  const rowSize = size * 3 + 1; // 3 bytes per pixel + 1 filter byte
  const dataSize = rowSize * size;
  const pixelData = Buffer.alloc(dataSize);
  
  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    pixelData[rowStart] = 0; // filter byte
    
    for (let x = 0; x < size; x++) {
      const pixelStart = rowStart + 1 + x * 3;
      pixelData[pixelStart] = color[0];     // R
      pixelData[pixelStart + 1] = color[1]; // G  
      pixelData[pixelStart + 2] = color[2]; // B
    }
  }
  
  // Сжимаем данные (очень простое сжатие)
  const compressedSize = dataSize + 6;
  const compressedData = Buffer.alloc(compressedSize);
  compressedData[0] = 0x78; // zlib header
  compressedData[1] = 0x01; // zlib header
  compressedData[2] = 0x01; // final block, no compression
  compressedData.writeUInt16LE(dataSize, 3);     // length
  compressedData.writeUInt16LE(~dataSize, 5);    // one's complement
  pixelData.copy(compressedData, 7);
  
  const idatChunk = Buffer.concat([
    Buffer.from([0x00, 0x00, 0x00, compressedSize]), // length
    Buffer.from('IDAT'),                              // type
    compressedData,
    Buffer.from([0x5B, 0xCB, 0x6E, 0xA0])           // CRC (приблизительный)
  ]);
  
  // IEND chunk
  const iendChunk = Buffer.from([
    0x00, 0x00, 0x00, 0x00, // length
    0x49, 0x45, 0x4E, 0x44, // IEND
    0xAE, 0x42, 0x60, 0x82  // CRC
  ]);
  
  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
};

async function createIcons() {
  console.log('🎨 Creating SVG-based extension icons...');
  
  const sizes = [16, 32, 48, 128];
  
  // Создаем директорию если не существует
  await fs.ensureDir('./dist-extension');
  
  for (const size of sizes) {
    try {
      // Создаем SVG
      const svgContent = createSVGIcon(size);
      await fs.writeFile(`./dist-extension/icon${size}.svg`, svgContent);
      
      // Создаем простой PNG
      const pngData = createBasicPNG(size);
      await fs.writeFile(`./dist-extension/icon${size}.png`, pngData);
      
      console.log(`✅ Created icon${size}.png (${pngData.length} bytes) and icon${size}.svg`);
    } catch (error) {
      console.error(`❌ Error creating icon${size}:`, error.message);
    }
  }
  
  console.log('🎉 All icons created successfully!');
}

createIcons().catch(console.error);