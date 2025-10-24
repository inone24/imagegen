import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { readJSON, writeJSON } from './utils.js';
import { logger } from './logger.js';

const argv = yargs(hideBin(process.argv))
  .option('page', { type: 'string', demandOption: true })
  .option('container', { type: 'string', demandOption: true })
  .option('manifest', { type: 'string', default: 'public/img/manifest.json' })
  .option('target', { type: 'string', default: 'content/images.json' })
  .strict()
  .parse();

function pickLatestFor(manifest, page, container){
  const hits = manifest.filter(m => m.page===page && m.container===container);
  if (hits.length) return hits[hits.length-1];
  const presetMap = { hero: 'hero_photoreal', slider: 'slider_emotion', product: 'product_studio' };
  const preset = presetMap[container];
  const recent = manifest.filter(m => m.preset===preset);
  return recent.length ? recent[recent.length-1] : null;
}

(function main(){
  const manifest = readJSON(argv.manifest, []);
  const pick = pickLatestFor(manifest, argv.page, argv.container);
  if (!pick){ logger.error({ page: argv.page, container: argv.container }, 'No suitable image found'); process.exit(1); }
  const targetPath = path.resolve(argv.target);
  let db = {};
  if (fs.existsSync(targetPath)) db = JSON.parse(fs.readFileSync(targetPath,'utf8'));
  if (!db[argv.page]) db[argv.page] = {};

  const file = pick.files[0];
  db[argv.page][argv.container] = {
    file,
    alt: pick.alt || pick.description || pick.prompt,
    description: pick.description || null,
    keywords: pick.keywords || [],
    generatedAt: pick.createdAt
  };

  writeJSON(targetPath, db);
  logger.info({ page: argv.page, container: argv.container, file }, 'content linked');
})();
