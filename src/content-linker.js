// src/content-linker.js
import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { readJSON, writeJSON } from './utils.js';
import { logger } from './logger.js';

const argv = yargs(hideBin(process.argv))
  .option('page',       { type: 'string', demandOption: true })
  .option('container',  { type: 'string', demandOption: true }) // hero|slider|product
  .option('manifest',   { type: 'string', default: 'public/img/manifest.json' })
  .option('target',     { type: 'string', default: 'content/images.json' })
  .option('preset',     { type: 'string', default: '' })        // e.g. slider_emotion
  .option('from-index', { type: 'number', default: -1 })        // manifest length BEFORE generation
  .strict()
  .parse();

function mapPresetToContainer(preset) {
  if (!preset) return null;
  if (preset.startsWith('hero_')) return 'hero';
  if (preset.startsWith('slider_')) return 'slider';
  if (preset.startsWith('product_')) return 'product';
  return null;
}

(function main(){
  const manifest = readJSON(argv.manifest, []);
  const start = argv['from-index'] >= 0 ? argv['from-index'] : Math.max(0, manifest.length - 1);
  const newly = manifest.slice(start);

  if (newly.length === 0) {
    logger.error({ page: argv.page, container: argv.container, start }, 'No new manifest entries found');
    process.exit(1);
  }

  // Filter nach (optionalem) preset; andernfalls nach container-Mapping des presets
  let candidates = newly;
  if (argv.preset) {
    candidates = candidates.filter(e => e.preset === argv.preset);
  } else {
    candidates = candidates.filter(e => mapPresetToContainer(e.preset) === argv.container);
  }

  if (candidates.length === 0) {
    logger.error({ page: argv.page, container: argv.container, preset: argv.preset, start }, 'No matching entries for container/preset');
    process.exit(1);
  }

  const targetPath = path.resolve(argv.target);
  let db = {};
  if (fs.existsSync(targetPath)) db = JSON.parse(fs.readFileSync(targetPath,'utf8'));
  const pageKey = argv.page.endsWith('/') ? argv.page.slice(0,-1) : argv.page;
  if (!db[pageKey]) db[pageKey] = {};

  // Helper: first representative file of a manifest entry (größte JPG meist zuerst in unserer Pipeline)
  function pickFile(entry) {
    const f = Array.isArray(entry.files) && entry.files.length ? entry.files[0] : null;
    return f || '';
  }

  if (argv.container === 'slider') {
    const arr = candidates.map(e => ({
      file: pickFile(e),
      alt: e.alt || e.prompt || '',
      description: e.description || null,
      keywords: e.keywords || [],
      generatedAt: e.createdAt
    })).filter(x => x.file);

    if (arr.length === 0) {
      logger.error({ candidates: candidates.length }, 'No files in candidates');
      process.exit(1);
    }
    db[pageKey]['slider'] = arr;
  } else {
    // hero / product → nur der letzte relevante Eintrag
    const last = candidates[candidates.length - 1];
    const file = pickFile(last);
    if (!file) {
      logger.error({ last }, 'No file in last entry');
      process.exit(1);
    }
    db[pageKey][argv.container] = {
      file,
      alt: last.alt || last.prompt || '',
      description: last.description || null,
      keywords: last.keywords || [],
      generatedAt: last.createdAt
    };
  }

  writeJSON(targetPath, db);
  logger.info({ page: argv.page, container: argv.container, added: candidates.length, start }, 'content linked');
})();
