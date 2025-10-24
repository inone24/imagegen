import sharp from 'sharp';
import path from 'path';
import fs from 'fs';
import { ensureDir } from './utils.js';
import { logger } from './logger.js';

export async function saveMultiFormats(buf, {
  outDir, baseName, sizes=[[1200,1200]], formats=['jpg','webp','avif'], quality=90, withLqip=true
}) {
  ensureDir(outDir);
  const results = [];
  for (const [w,h] of sizes) {
    const base = sharp(buf).withMetadata();
    const resized = await base.resize(w, h, { fit: 'cover', position: 'centre' }).toBuffer();
    for (const fmt of formats) {
      let conv = sharp(resized).withMetadata();
      switch(fmt){
        case 'jpg': conv = conv.jpeg({ quality, mozjpeg: true }); break;
        case 'png': conv = conv.png(); break;
        case 'webp': conv = conv.webp({ quality }); break;
        case 'avif': conv = conv.avif({ quality }); break;
        default: continue;
      }
      const file = path.join(outDir, `${baseName}-${w}x${h}.${fmt}`);
      await conv.toFile(file);
      results.push(file);
      if (withLqip && fmt === 'jpg') {
        const lqip = await sharp(resized).resize(32).jpeg({ quality: 30 }).toBuffer();
        await fs.promises.writeFile(`${file}.lqip.txt`, `data:image/jpeg;base64,${lqip.toString('base64')}`);
      }
      logger.info({ file }, 'wrote file');
    }
  }
  return results;
}
