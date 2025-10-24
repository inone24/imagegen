import fs from 'fs';
import path from 'path';
import yargs from 'yargs/yargs';
import { hideBin } from 'yargs/helpers';
import { validatePromptRules } from './validate-config.js';

const argv = yargs(hideBin(process.argv))
  .option('page', { type: 'string', demandOption: true })
  .option('container', { type: 'string', demandOption: true })
  .option('brand', { type: 'string', default: 'GrowCologne' })
  .option('keywords', { type: 'string', default: '' })
  .option('desc', { type: 'string', default: '' })
  .option('alt', { type: 'string', default: '' })
  .option('out', { type: 'string', describe: 'Write JSON meta to file' })
  .strict()
  .parse();

const rules = validatePromptRules();

function pageTopic(page){
  const slug = page.split('/').filter(Boolean).pop() || 'default';
  return rules.topics[slug] || { subject: 'shop interior', materials: 'modern fixtures', details: 'clean lighting' };
}

function buildPrompt({page, container, brand, keywords, desc, alt}){
  const topic = pageTopic(page);
  const cont = rules.containers[container] || rules.containers.hero;
  const style = cont.style;
  const avoid = [rules.negatives, cont.avoid].filter(Boolean).join(', ');
  const mood = `Brand mood: ${brand}`;
  const kw = keywords ? `Keywords: ${keywords}` : '';
  const extra = desc ? `Context: ${desc}` : '';
  return `${topic.subject}, ${topic.materials}, ${topic.details}. ${mood}. ${kw} ${extra} Style: ${style}. Avoid: ${avoid}.`;
}

const prompt = buildPrompt({ page: argv.page, container: argv.container, brand: argv.brand, keywords: argv.keywords, desc: argv.desc, alt: argv.alt });
const meta = { prompt, page: argv.page, container: argv.container, alt: argv.alt || `${argv.brand} ${argv.container} visual`, description: argv.desc, keywords: argv.keywords? argv.keywords.split(',').map(s=>s.trim()).filter(Boolean): [] };

if (argv.out){ fs.writeFileSync(argv.out, JSON.stringify(meta, null, 2)); }
process.stdout.write(JSON.stringify(meta));
