import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const iconsDir = path.resolve(__dirname, '../public/icons');

if (!fs.existsSync(iconsDir)) {
  fs.mkdirSync(iconsDir, { recursive: true });
}

// Function to generate PNG buffer with RGBA pixels
function createPng(width, height, pixelFn) {
  const bytesPerPixel = 4;
  const scanlineLength = width * bytesPerPixel;
  const rawData = Buffer.alloc((scanlineLength + 1) * height);

  for (let y = 0; y < height; y++) {
    const rowOffset = y * (scanlineLength + 1);
    rawData[rowOffset] = 0; // Filter type 0 (None)
    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * bytesPerPixel;
      const [r, g, b, a] = pixelFn(x, y, width, height);
      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = a;
    }
  }

  const deflated = zlib.deflateSync(rawData);

  // PNG Signature
  const signature = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  // IHDR chunk
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // Bit depth: 8
  ihdr[9] = 6; // Color type: 6 (RGBA)
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = createChunk('IHDR', ihdr);
  const idatChunk = createChunk('IDAT', deflated);
  const iendChunk = createChunk('IEND', Buffer.alloc(0));

  return Buffer.concat([signature, ihdrChunk, idatChunk, iendChunk]);
}

function createChunk(type, data) {
  const length = data.length;
  const buffer = Buffer.alloc(4 + 4 + length + 4);
  buffer.writeUInt32BE(length, 0);
  buffer.write(type, 4, 4, 'ascii');
  data.copy(buffer, 8);

  const crc = crc32(buffer.subarray(4, 8 + length));
  buffer.writeUInt32BE(crc, 8 + length);
  return buffer;
}

// CRC32 implementation for PNG
function crc32(buf) {
  let c = 0xffffffff;
  for (let n = 0; n < buf.length; n++) {
    c = (c ^ buf[n]) >>> 0;
    for (let k = 0; k < 8; k++) {
      c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) >>> 0 : (c >>> 1) >>> 0;
    }
  }
  return (c ^ 0xffffffff) >>> 0;
}

// Draw AudioFlow icon: rounded dark square with gradient purple/cyan soundwave bars
function renderAudioFlowPixel(x, y, width, height) {
  const nx = x / width;
  const ny = y / height;
  const cx = 0.5;
  const cy = 0.5;

  // Background rounded rectangle
  const cornerRadius = 0.22;
  const dx = Math.max(0, Math.abs(nx - cx) - (0.5 - cornerRadius));
  const dy = Math.max(0, Math.abs(ny - cy) - (0.5 - cornerRadius));
  const dist = Math.sqrt(dx * dx + dy * dy);

  if (dist > cornerRadius) {
    return [0, 0, 0, 0]; // Transparent outside rounded corner
  }

  // Base background color #1A1B20 with subtle violet gradient
  let r = 26 + Math.floor(nx * 15);
  let g = 27 + Math.floor(ny * 10);
  let b = 32 + Math.floor((nx + ny) * 20);
  let a = 255;

  // Sound bars inside (5 vertical bars)
  const bars = [
    { x: 0.28, h: 0.35, color: [167, 139, 250] }, // Violet
    { x: 0.39, h: 0.60, color: [147, 160, 252] },
    { x: 0.50, h: 0.78, color: [34, 211, 238] },  // Cyan (center)
    { x: 0.61, h: 0.55, color: [147, 160, 252] },
    { x: 0.72, h: 0.30, color: [167, 139, 250] },
  ];

  const barWidth = 0.07;
  for (const bar of bars) {
    const left = bar.x - barWidth / 2;
    const right = bar.x + barWidth / 2;
    const top = cy - bar.h / 2;
    const bottom = cy + bar.h / 2;

    if (nx >= left && nx <= right && ny >= top && ny <= bottom) {
      // Rounded ends of bars
      return [bar.color[0], bar.color[1], bar.color[2], 255];
    }
  }

  return [r, g, b, a];
}

const sizes = [16, 32, 48, 128];
sizes.forEach(size => {
  const buf = createPng(size, size, renderAudioFlowPixel);
  const outPath = path.resolve(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, buf);
  console.log(`Generated: ${outPath} (${size}x${size})`);
});

