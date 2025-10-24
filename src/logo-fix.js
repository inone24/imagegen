import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import sharp from 'sharp';
import potraceModule from 'potrace';
import { ensureDir } from './utils.js';
import { logger } from './logger.js';

const { Potrace } = potraceModule; // CommonJS default export

const argv = yargs(hideBin(process.argv))
  .option('url', { type: 'string' })
  .option('file', { type: 'string' })
  .option('out', { type: 'string', default: 'public/img/logos' })
  .option('vectorize', { type: 'boolean', default: true })
  .option('variants', { type: 'string', default: 'svg,png' })
  .option('size', { type: 'number', default: 1024 })
  .strict()
  .parse();

async function fetchBuffer(url){
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Fetch failed: ${res.status}`);
  return Buffer.from(await res.arrayBuffer());
}

async function loadInput(){
  if (argv.url) return { name: path.basename(new URL(argv.url).pathname) || 'logo.png', buf: await fetchBuffer(argv.url) };
  if (argv.file) return { name: path.basename(argv.file), buf: fs.readFileSync(argv.file) };
  const dir = 'input/logos';
  const f = fs.existsSync(dir) ? fs.readdirSync(dir).find(f=>/\.(png|jpe?g|webp|svg|ico)$/i.test(f)) : null;
  if (!f) throw new Error('No logo found (use --url, --file or place one into input/logos)');
  return { name: f, buf: fs.readFileSync(path.join(dir,f)) };
}

async function cleanLogo(buf){
  let img = sharp(buf).flatten({ background: { r:255,g:255,b:255 } }).removeAlpha().toColourspace('srgb');
  const meta = await img.metadata();
  const width = meta.width || 512;
  if (width < argv.size) img = img.resize(argv.size);
  img = img.normalize();
  return await img.png({ compressionLevel: 9 }).toBuffer();
}

async function toSVG(pngBuf){
  return await new Promise((resolve,reject)=>{
    new Potrace(pngBuf).setParameters({ threshold: 200, turdSize: 2, turnPolicy: Potrace.TURNPOLICY_MINORITY }).trace((err, svg)=>{
      if (err) reject(err); else resolve(svg);
    });
  });
}

(async()=>{
  try{
    const { name, buf } = await loadInput();
    ensureDir(argv.out);
    const base = path.join(argv.out, path.basename(name, path.extname(name)));

    const cleaned = await cleanLogo(buf);
    const pngOut = `${base}.png`;
    await fs.promises.writeFile(pngOut, cleaned);
    logger.info({ pngOut }, 'PNG cleaned');

    if (argv.vectorize && argv.variants.includes('svg')){
      const svg = await toSVG(cleaned);
      const svgOut = `${base}.svg`;
      await fs.promises.writeFile(svgOut, svg);
      logger.info({ svgOut }, 'SVG traced');
    }
  } catch(e){
    logger.error(e, 'logo-fix failed');
    process.exit(1);
  }
})();
