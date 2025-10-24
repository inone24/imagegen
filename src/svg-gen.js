import 'dotenv/config';
import fs from 'fs';
import path from 'path';
import OpenAI from 'openai';
import { ensureDir } from './utils.js';
import { logger } from './logger.js';

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const out = process.argv[2] || 'public/img/icons';
ensureDir(out);

const iconSet = process.argv[3] || 'ui_basic';
const brief = iconSet === 'ui_basic'
  ? 'Generate 6 minimalist, monochrome SVG icons: leaf, grinder, bong, lighter, filter, papers. 24x24 grid, 2px stroke, rounded caps, no fills, no fonts.'
  : process.argv.slice(4).join(' ');

try {
  const res = await client.responses.create({
    model: 'gpt-4o-mini',
    input: [ { role: 'user', content: `Return ONLY valid <svg> files concatenated with "\n---\n" between.\n${brief}` } ]
  });
  const text = res.output_text
    || (res?.output?.map(o=>o?.content?.map(c=>c?.text?.value).join('\n')).join('\n'))
    || (res?.choices?.[0]?.message?.content)
    || '';
  const parts = String(text).trim().split(/\n---\n/);
  let i=1;
  for (const svg of parts){
    const name = path.join(out, `icon-${String(i++).padStart(2,'0')}.svg`);
    fs.writeFileSync(name, svg);
    logger.info({ name }, 'SVG written');
  }
} catch (e){
  logger.error(e, 'svg-gen failed');
  process.exit(1);
}
