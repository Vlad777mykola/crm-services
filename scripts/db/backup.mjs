import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { runDestructiveOperation } from './lib/destructive.mjs';
import { pgDumpToFile } from './lib/pg-exec.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BACKUPS_DIR = path.join(ROOT, 'db/backups');

const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

if (!fs.existsSync(BACKUPS_DIR)) {
  fs.mkdirSync(BACKUPS_DIR, { recursive: true });
}

const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const filename = args.name
  ? `${args.name.replace(/\.dump$/, '')}.dump`
  : `${target.name}-${stamp}.dump`;
const outPath = path.join(BACKUPS_DIR, filename);

printOperationBanner({ action: 'BACKUP', target });
pgDumpToFile(ROOT, target, outPath);
const sizeKb = (fs.statSync(outPath).size / 1024).toFixed(1);
console.log(`[db:backup] wrote ${sizeKb} KiB → ${path.relative(ROOT, outPath)}`);
