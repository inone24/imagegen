import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { editOpenAI, generateOpenAI } from './providers/openai.js';
import { saveMultiFormats } from './postprocess.js';
import { ensureDir, fileStem } from './utils.js';
import { logger } from './logger.js';
import removeBackground from '@imgly/background-removal-node';

const inDir = process.argv[2] || 'input/product';
const outDir = process.argv[3] || 'public/img/product';
const mode = process.argv[4] || 'isolate-white';

ensureDir(outDir);

const files = fs.readdirSync(inDir).filter(f => /\.(png|jpe?g|webp)$/i.test(f));

async function tryOpenAIEdit(tmp, prompt){
  try { return await editOpenAI({ imagePath: tmp, prompt, size: '1024x1024', transparent: (mode==='product_transparent') }); }
  catch(err){ logger.warn({ err }, 'OpenAI edit failed, trying BG-removal fallback'); return null; }
}

async function fallbackBgRemoval(buf){
  try { return await removeBackground(buf); } catch(e){ logger.error(e, 'BG removal failed'); return null; }
}

(async () => {
  for (const f of files){
    const srcPath = path.join(inDir, f);
    const imgBuf = fs.readFileSync(srcPath);
    const tmp = path.join(os.tmpdir(), `${fileStem(path.basename(f, path.extname(f)), 'tmp')}.png`);
    fs.writeFileSync(tmp, imgBuf);

    const prompt = mode === 'isolate-white'
      ? 'Isolate product on pure white background with a soft natural shadow; preserve exact proportions and labels'
      : 'Enhance product realism and lighting';

    let out = await tryOpenAIEdit(tmp, prompt);

    if(!out && mode === 'isolate-white'){
      const cut = await fallbackBgRemoval(imgBuf);
      if (cut) out = cut;
    }

    if(!out){
      logger.warn({ file: f }, 'Both edit and BG-removal failed; generating neutral studio image as last resort');
      const gen = await generateOpenAI({ prompt: 'studio product photography of a generic glass item on pure white, soft shadow', size: '1024x1024', count: 1 });
      out = gen[0];
    }

    const base = fileStem(path.basename(f, path.extname(f)), 'product');
    await saveMultiFormats(out, { outDir, baseName: base, sizes: [[1200,1200],[800,800]], formats: ['jpg','webp','png'], quality: 92 });
    logger.info({ file: f }, '✅ Edited');
  }
})();
