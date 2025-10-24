import fs from 'fs';
import path from 'path';

export function ensureDir(p) { fs.mkdirSync(p, { recursive: true }); }
export function slug(s) { return s.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-+|-+$/g,'').slice(0,80); }
export function ts() { return new Date().toISOString().replace(/[:.]/g,'-'); }
export function writeJSON(p, obj) { fs.writeFileSync(p, JSON.stringify(obj, null, 2)); }
export function readJSON(p, def=[]) { return fs.existsSync(p) ? JSON.parse(fs.readFileSync(p,'utf8')) : def; }
export function fileStem(prompt, prefix) { return `${prefix}-${slug(prompt).slice(0,40)}-${ts()}`; }
export function isTrue(v){ return v===true || v==='true' || v===1 || v==='1'; }

export async function retry(fn, { retries=Number(process.env.OPENAI_MAX_RETRIES)||3, base=400, factor=2, jitter=0.2 }={}){
  let attempt=0, lastErr;
  while(attempt<=retries){
    try { return await fn(attempt); } catch(e){ lastErr=e; if(attempt===retries) break; const ms = Math.round((base*Math.pow(factor,attempt))*(1+Math.random()*jitter)); await new Promise(r=>setTimeout(r,ms)); attempt++; }
  }
  throw lastErr;
}
