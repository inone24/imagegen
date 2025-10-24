import { readJSON, writeJSON } from './utils.js';
import { logger } from './logger.js';

export function updateManifest(manifestPath, entries) {
  const manifest = readJSON(manifestPath, []);
  const normalized = entries.map(e => ({
    preset: e.preset,
    prompt: e.prompt,
    files: e.files,
    createdAt: e.createdAt || new Date().toISOString(),
    page: e.page || null,
    container: e.container || null,
    alt: e.alt || null,
    description: e.description || null,
    keywords: e.keywords || []
  }));
  manifest.push(...normalized);
  writeJSON(manifestPath, manifest);
  logger.info({ added: normalized.length, manifestPath }, 'manifest updated');
}
