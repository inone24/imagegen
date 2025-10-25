import 'dotenv/config';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { generateOpenAI } from './providers/openai.js';
import { saveMultiFormats } from './postprocess.js';
import { ensureDir, fileStem } from './utils.js';
import { logger } from './logger.js';
import { validatePresets } from './validate-config.js';
import fs from 'fs';

const argv = yargs(hideBin(process.argv))
  .option('preset', { type: 'string', demandOption: true })
  .option('prompt', { type: 'string' })
  .option('count', { type: 'number' })
  .option('meta', { type: 'string', describe: 'Path to JSON with {prompt,alt,description,keywords,page,container}' })
  .strict()
  .parse();

if (!process.env.OPENAI_API_KEY) {
  console.error(
    "❌ OPENAI_API_KEY fehlt.\n" +
    "Nutze den Orchestrator-Workflow (Actions), oder setze lokal temporär:\n" +
    "  export OPENAI_API_KEY=sk-... && node src/index.js --preset ...\n"
  );
  process.exit(1);
}

const presets = validatePresets();
const preset = presets[argv.preset];
if (!preset) { logger.error({ preset: argv.preset }, 'Unknown preset'); process.exit(1); }

let meta = { prompt: argv.prompt };
if (argv.meta){
  try { meta = JSON.parse(fs.readFileSync(argv.meta,'utf8')); }
  catch(e){ logger.error(e, 'Invalid --meta JSON'); process.exit(1); }
}
if (!meta.prompt){ logger.error('Prompt missing (provide --prompt or --meta)'); process.exit(1); }

const finalPrompt = `${meta.prompt}. Style: ${preset.style.base}. Avoid: ${preset.style.negative}.`;
const count = argv.count || preset.options.count || 1;

async function run(){
  const outSub = preset.output_subdir || 'misc';
  const outDir = path.resolve('public', 'img', outSub);
  ensureDir(outDir);

  const bufs = await generateOpenAI({
    prompt: finalPrompt,
    size: preset.options.size,
    count
  });

  const entries = [];
  for (let i=0;i<bufs.length;i++){
    const baseName = fileStem(meta.prompt, argv.preset) + `-${String(i+1).padStart(2,'0')}`;
    const files = await saveMultiFormats(bufs[i], {
      outDir,
      baseName,
      sizes: preset.sizes,
      formats: preset.formats,
      quality: preset.quality
    });
    entries.push({ preset: argv.preset, prompt: meta.prompt, files, createdAt: new Date().toISOString(), page: meta.page, container: meta.container, alt: meta.alt, description: meta.description, keywords: meta.keywords });
  }

  const manifestPath = path.join('public','img','manifest.json');
  const { updateManifest } = await import('./manifest.js');
  updateManifest(manifestPath, entries);
  logger.info({ items: entries.length }, 'generation complete');
}

run().catch(e=>{ logger.error(e, 'fatal'); process.exit(1); });
