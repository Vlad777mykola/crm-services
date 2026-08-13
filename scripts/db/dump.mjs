import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { pgDumpToFile } from './lib/pg-exec.mjs';
import { assertOperationAllowed, BASELINE_DUMP_NAME, parseDatabaseUrl } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const DUMPS_DIR = path.join(ROOT, 'db/dumps');

const args = process.argv.slice(2);
const name = args.find((a) => !a.startsWith('--')) ?? BASELINE_DUMP_NAME;
const outPath = path.join(DUMPS_DIR, name);

const parsed = parseDatabaseUrl();
assertOperationAllowed(parsed, 'dump');

if (!fs.existsSync(DUMPS_DIR)) {
  fs.mkdirSync(DUMPS_DIR, { recursive: true });
}

console.log(`[db:dump] ${parsed.target.label} :${parsed.port}/${parsed.database} → ${outPath}`);
pgDumpToFile(ROOT, parsed, outPath);
console.log(`[db:dump] wrote ${(fs.statSync(outPath).size / 1024).toFixed(1)} KiB`);
