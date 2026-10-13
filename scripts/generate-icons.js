// Pure Node.js script to generate crisp PNG icons for Chrome Extension
// Generates 16x16, 48x48, and 128x128 icons with deep-blue gradient & stylized logo

import fs from 'fs';
import path from 'path';
import zlib from 'zlib';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function crc32(buf) {
  let table = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let j = 0; j < 8; j++) {
      c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    }
    table[i] = c >>> 0;
  }
  let crc = 0xFFFFFFFF;
  for (let i = 0; i < buf.length; i++) {
    crc = table[(crc ^ buf[i]) & 0xFF] ^ (crc >>> 8);
  }
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

function makeChunk(type, data) {
  const typeBuf = Buffer.from(type, 'ascii');
  const lenBuf = Buffer.alloc(4);
  lenBuf.writeUInt32BE(data.length, 0);

  const toCrc = Buffer.concat([typeBuf, data]);
  const crcVal = crc32(toCrc);
  const crcBuf = Buffer.alloc(4);
  crcBuf.writeUInt32BE(crcVal, 0);

  return Buffer.concat([lenBuf, typeBuf, data, crcBuf]);
}

function createPng(size) {
  const width = size;
  const height = size;

  // Raw pixel data with filter byte per line
  const scanlineLength = width * 4 + 1;
  const rawData = Buffer.alloc(scanlineLength * height);

  const radius = size * 0.22;
  const cx = size / 2;
  const cy = size / 2;

  for (let y = 0; y < height; y++) {
    const rowOffset = y * scanlineLength;
    rawData[rowOffset] = 0; // Filter byte 0 (None)

    for (let x = 0; x < width; x++) {
      const pixelOffset = rowOffset + 1 + x * 4;

      // Rounded rect distance
      const dx = Math.max(0, Math.abs(x + 0.5 - cx) - (cx - radius));
      const dy = Math.max(0, Math.abs(y + 0.5 - cy) - (cy - radius));
      const dist = Math.sqrt(dx * dx + dy * dy);

      if (dist > radius) {
        // Transparent outside rounded corner
        rawData[pixelOffset] = 0;
        rawData[pixelOffset + 1] = 0;
        rawData[pixelOffset + 2] = 0;
        rawData[pixelOffset + 3] = 0;
        continue;
      }

      // Smooth anti-aliasing on corner edge
      let alpha = 255;
      if (dist > radius - 1) {
        alpha = Math.round(255 * (radius - dist));
      }

      // Background Gradient: Deep Blue #0f172a to Electric Deep Blue #1d4ed8
      const t = (x + y) / (width + height);
      let r = Math.round(15 + (29 - 15) * t);
      let g = Math.round(23 + (78 - 23) * t);
      let b = Math.round(58 + (216 - 58) * t);

      // Draw stylized Document / "A" emblem in center
      const nx = (x - cx) / (size * 0.5);
      const ny = (y - cy) / (size * 0.5);

      // Outer document sheet outline
      const isDocBody = nx >= -0.55 && nx <= 0.55 && ny >= -0.65 && ny <= 0.65;
      const isDocFold = nx > 0.15 && ny < -0.25;

      // Inner lines representing document intelligence
      const isLine1 = nx >= -0.35 && nx <= 0.1 && Math.abs(ny - (-0.15)) <= 0.06;
      const isLine2 = nx >= -0.35 && nx <= 0.35 && Math.abs(ny - (0.08)) <= 0.06;
      const isLine3 = nx >= -0.35 && nx <= 0.2 && Math.abs(ny - (0.3)) <= 0.06;

      // Lightning/AI spark dot in bottom right
      const isSpark = Math.hypot(nx - 0.28, ny - 0.3) < 0.14;

      if (isDocBody && !isDocFold) {
        // Document fill: pristine white / light cyan highlight
        r = 255;
        g = 255;
        b = 255;

        // Document lines in royal blue
        if (isLine1 || isLine2 || isLine3) {
          r = 37;
          g = 99;
          b = 235;
        }
      }

      if (isSpark) {
        // Electric Blue Accent dot
        r = 59;
        g = 130;
        b = 246;
      }

      rawData[pixelOffset] = r;
      rawData[pixelOffset + 1] = g;
      rawData[pixelOffset + 2] = b;
      rawData[pixelOffset + 3] = alpha;
    }
  }

  // Header chunk (IHDR)
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(width, 0);
  ihdr.writeUInt32BE(height, 4);
  ihdr[8] = 8; // 8-bit depth
  ihdr[9] = 6; // Color type 6: RGBA
  ihdr[10] = 0; // Compression
  ihdr[11] = 0; // Filter
  ihdr[12] = 0; // Interlace

  const ihdrChunk = makeChunk('IHDR', ihdr);
  const compressedData = zlib.deflateSync(rawData);
  const idatChunk = makeChunk('IDAT', compressedData);
  const iendChunk = makeChunk('IEND', Buffer.alloc(0));

  const pngSignature = Buffer.from([0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]);
  return Buffer.concat([pngSignature, ihdrChunk, idatChunk, iendChunk]);
}

const iconsDir = path.resolve(__dirname, '../public/icons');
fs.mkdirSync(iconsDir, { recursive: true });

[16, 48, 128].forEach((size) => {
  const pngBuf = createPng(size);
  const outPath = path.join(iconsDir, `icon${size}.png`);
  fs.writeFileSync(outPath, pngBuf);
  console.log(`Generated icon: ${outPath} (${size}x${size})`);
});
