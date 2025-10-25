import fs from 'fs';
import OpenAI from 'openai';
import { logger } from '../logger.js';
import { retry } from '../utils.js';

function clientOpts(){
  const timeout = Number(process.env.OPENAI_TIMEOUT_MS)||180000;
  return { apiKey: process.env.OPENAI_API_KEY, timeout };
}

// OpenAI Images (2025): '1024x1024', '1024x1536', '1536x1024', 'auto'
function normalizeSize(size){
  const allowed = new Set(['1024x1024','1024x1536','1536x1024','auto']);
  if (!size) return '1024x1024';
  const s = String(size).toLowerCase();
  if (allowed.has(s)) return s;
  const m = s.match(/(\d+)\s*x\s*(\d+)/);
  if (m){
    const w = parseInt(m[1],10), h = parseInt(m[2],10);
    if (Number.isFinite(w) && Number.isFinite(h)){
      return (w>=h) ? '1536x1024' : '1024x1536';
    }
  }
  return '1024x1024';
}

export async function generateOpenAI({ prompt, size='1024x1024', count=1 }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing credentials. Set OPENAI_API_KEY in env (oder nutze den Orchestrator-Workflow).");
  }
  const client = new OpenAI(clientOpts());
  return retry(async (attempt)=>{
    const normSize = normalizeSize(size);
    logger.info({ attempt, size: normSize, count }, 'OpenAI images.generate');
    const opt = { model: 'gpt-image-1', prompt, size: normSize, n: count };
    const res = await client.images.generate(opt);
    return res.data.map(x => Buffer.from(x.b64_json, 'base64'));
  });
}

export async function editOpenAI({ imagePath, prompt, size='1024x1024', transparent=false }) {
  if (!process.env.OPENAI_API_KEY) {
    throw new Error("Missing credentials. Set OPENAI_API_KEY in env (oder nutze den Orchestrator-Workflow).");
  }
  const client = new OpenAI(clientOpts());
  return retry(async (attempt)=>{
    const normSize = normalizeSize(size);
    logger.info({ attempt, size: normSize, transparent }, 'OpenAI images.edits');
    const params = { model: 'gpt-image-1', prompt, size: normSize };
    if (transparent) params.background = 'transparent'; // nur Edits unterstützen echtes Alpha
    const res = await client.images.edits({ ...params, image: fs.createReadStream(imagePath) });
    return Buffer.from(res.data[0].b64_json, 'base64');
  });
}
