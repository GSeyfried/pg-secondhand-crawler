import { readFile } from 'node:fs/promises';

export const defaults = Object.freeze({ dryRun: true, batchSize: 10, maxListings: 25, startOffset: 0, concurrency: 2, delayMs: 1000, source: 'paragliding-secondhand', categories: ['full-kits','paragliders','harnesses','reserves','helmets'], resume: false, forceRefresh: false, verbose: false, fixtureOnly: false, timeoutMs: 15000, maxRetries: 3, indexPages: 1, dataDir: 'data' });
const numberKeys = new Set(['batchSize','maxListings','startOffset','concurrency','delayMs','timeoutMs','maxRetries','indexPages']);
const booleanKeys = new Set(['dryRun','resume','forceRefresh','verbose','fixtureOnly']);
const names = { 'dry-run':'dryRun', 'batch-size':'batchSize', 'max-listings':'maxListings', 'start-offset':'startOffset', concurrency:'concurrency', 'delay-ms':'delayMs', source:'source', categories:'categories', resume:'resume', 'force-refresh':'forceRefresh', verbose:'verbose', 'fixture-only':'fixtureOnly', 'timeout-ms':'timeoutMs', 'max-retries':'maxRetries', 'index-pages':'indexPages', 'data-dir':'dataDir' };
const envNames = Object.fromEntries(Object.values(names).map(k => [k, `PG_CRAWLER_${k.replace(/[A-Z]/g, m => `_${m}`).toUpperCase()}`]));

function asBoolean(value, name) {
  if (typeof value === 'boolean') return value;
  if (/^(1|true|yes|on)$/i.test(String(value))) return true;
  if (/^(0|false|no|off)$/i.test(String(value))) return false;
  throw new Error(`${name} must be a boolean`);
}
function coerce(key, value) {
  if (key === 'categories') return Array.isArray(value) ? value : String(value).split(',').map(x=>x.trim()).filter(Boolean);
  if (booleanKeys.has(key)) return asBoolean(value, key);
  if (numberKeys.has(key)) { const n = Number(value); if (!Number.isInteger(n) || n < 0) throw new Error(`${key} must be a non-negative integer`); return n; }
  return value;
}
export function parseArgs(argv) {
  const out = {}; let configPath;
  for (let i=0; i<argv.length; i++) {
    const token = argv[i];
    if (token === '--help' || token === '-h') { out.help = true; continue; }
    if (!token.startsWith('--')) throw new Error(`Unexpected argument: ${token}`);
    let [raw, inline] = token.slice(2).split('=', 2); let negated = false;
    if (raw.startsWith('no-')) { negated = true; raw = raw.slice(3); }
    if (raw === 'config') { configPath = inline ?? argv[++i]; continue; }
    const key = names[raw]; if (!key) throw new Error(`Unknown option: --${raw}`);
    if (booleanKeys.has(key)) out[key] = negated ? false : inline === undefined ? true : coerce(key, inline);
    else { if (negated) throw new Error(`--no-${raw} is invalid`); out[key] = coerce(key, inline ?? argv[++i]); }
  }
  return { values: out, configPath };
}
export async function loadConfig(argv, env=process.env) {
  const parsed = parseArgs(argv); let file = {};
  if (parsed.configPath) file = JSON.parse(await readFile(parsed.configPath, 'utf8'));
  const fromEnv = {};
  for (const [key, name] of Object.entries(envNames)) if (env[name] !== undefined) fromEnv[key] = coerce(key, env[name]);
  const config = { ...defaults, ...file, ...fromEnv, ...parsed.values };
  for (const key of numberKeys) config[key] = coerce(key, config[key]);
  config.categories=coerce('categories',config.categories);
  if (config.batchSize < 1 || config.concurrency < 1 || config.indexPages < 1) throw new Error('batchSize, concurrency, and indexPages must be at least 1');
  if (!config.categories.length) throw new Error('categories must include at least one category');
  return config;
}
export const help = `pg-secondhand-crawler\n\nOptions:\n  --dry-run / --no-dry-run\n  --batch-size N --max-listings N --start-offset N\n  --concurrency N --delay-ms N --source NAME|all\n  --categories full-kits,paragliders,harnesses,reserves,helmets\n  --resume --force-refresh --verbose --fixture-only\n  --timeout-ms N --max-retries N --index-pages N\n  --config FILE --data-dir DIR`;
