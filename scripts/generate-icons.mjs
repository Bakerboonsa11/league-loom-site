import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import sharp from 'sharp';

const src = resolve('public/logo.jpg');
const out192 = resolve('public/icon-192.png');
const out512 = resolve('public/icon-512.png');

async function ensureDir(filePath) {
  const dir = dirname(filePath);
  await mkdir(dir, { recursive: true });
}

async function makeIcon(size, outPath) {
  const buf = await readFile(src);
  const img = sharp(buf).resize(size, size, { fit: 'cover' }).png({ compressionLevel: 9 });
  const out = await img.toBuffer();
  await ensureDir(outPath);
  await writeFile(outPath, out);
  console.log(`Generated ${outPath}`);
}

async function run() {
  try {
    await makeIcon(192, out192);
    await makeIcon(512, out512);
    console.log('Done.');
  } catch (e) {
    console.error('Failed to generate icons:', e);
    process.exit(1);
  }
}

run();
