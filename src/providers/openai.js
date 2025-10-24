import fs from 'fs';
import OpenAI from 'openai';
import { logger } from '../logger.js';
import { retry } from '../utils.js';

function clientOpts(){
  const timeout = Number(process.env.OPENAI_TIMEOUT_MS)||180000;
  return { apiKey: process.env.OPENAI_API_KEY, timeout };
}

export async function generateOpenAI({ prompt, size='1024x1024', count=1 }) {
  const client = new OpenAI(clientOpts());
  return retry(async (attempt)=>{
    logger.info({ attempt, size, count }, 'OpenAI images.generate');
    const opt = { model: 'gpt-image-1', prompt, size, n: count };
    const res = await client.images.generate(opt);
    return res.data.map(x => Buffer.from(x.b64_json, 'base64'));
  });
}

export async function editOpenAI({ imagePath, prompt, size='1024x1024', transparent=false }) {
  const client = new OpenAI(clientOpts());
  return retry(async (attempt)=>{
    logger.info({ attempt, size, transparent }, 'OpenAI images.edits');
    const params = { model: 'gpt-image-1', prompt, size };
    if (transparent) params.background = 'transparent';
    const res = await client.images.edits({ ...params, image: fs.createReadStream(imagePath) });
    return Buffer.from(res.data[0].b64_json, 'base64');
  });
}
