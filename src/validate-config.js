import fs from 'fs';
import path from 'path';
import Ajv from 'ajv';
import { logger } from './logger.js';

const ajv = new Ajv({ allErrors: true });

export function validatePresets(){
  const schema = JSON.parse(fs.readFileSync(path.join('config','schema','presets.schema.json'),'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join('config','presets.json'),'utf8'));
  const validate = ajv.compile(schema);
  if(!validate(data)){
    logger.error({ errors: validate.errors }, 'Invalid presets.json');
    throw new Error('Invalid presets.json');
  }
  return data;
}

export function validatePromptRules(){
  const schema = JSON.parse(fs.readFileSync(path.join('config','schema','prompt-rules.schema.json'),'utf8'));
  const data = JSON.parse(fs.readFileSync(path.join('config','prompt-rules.json'),'utf8'));
  const validate = ajv.compile(schema);
  if(!validate(data)){
    logger.error({ errors: validate.errors }, 'Invalid prompt-rules.json');
    throw new Error('Invalid prompt-rules.json');
  }
  return data;
}
