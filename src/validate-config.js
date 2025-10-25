import fs from 'fs';
import path from 'path';
import Ajv2020 from 'ajv/dist/2020.js';
import { logger } from './logger.js';

// Ajv 2020-12-Engine (bringt das Draft-2020-12-Metaschema mit)
const ajv = new Ajv2020({
  allErrors: true,
  strict: false
});

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
