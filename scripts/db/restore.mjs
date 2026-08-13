import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pgRestoreFromFile } from './lib/pg-exec.mjs';
import { assertOperationAllowed, BASELINE_DUMP_NAME, parseDatabaseUrl } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DUMPS_DIR = path.join(ROOT, 'db/dumps');

const args = process.argv.slice(2);
const useBaseline = args.includes('--baseline');
const positional = args.filter((a) => !a.startsWith('--'));
const name = positional[0] ?? 'dev-baseline.dump';
const inPath = path.join(DUMPS_DIR, name);

if (!fs.existsSync(inPath)) {
  console.error(`[db:restore] dump not found: ${inPath}`);
  console.error('  Create one with: yarn db:dump');
  console.error('  Or seed manually: yarn db:seed:companies');
  process.exit(1);
}

const parsed = parseDatabaseUrl();
assertOperationAllowed(parsed, 'restore');

console.log(`[db:restore] ${inPath} → ${parsed.target.label} :${parsed.port}/${parsed.database}`);
pgRestoreFromFile(ROOT, parsed, inPath);
console.log('[db:restore] done');
