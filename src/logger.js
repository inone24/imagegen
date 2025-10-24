import pino from 'pino';

const level = process.env.LOG_LEVEL || 'info';
export const logger = pino({ level, base: undefined, redact: ['OPENAI_API_KEY'] });

export function logStep(msg, extra={}){ logger.info({ step: msg, ...extra }, msg); }
export function logError(err, ctx={}){ logger.error({ err: toErr(err), ...ctx }, err?.message || 'Error'); }
function toErr(e){ if(!e) return undefined; return { message: e.message, stack: e.stack, code: e.code, status: e.status, data: e.response?.data }; }
