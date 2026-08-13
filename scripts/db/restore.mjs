import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { restoreWithGate } from './lib/restore-pipeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseDbCliArgs(process.argv.slice(2));

if (!args.file) {
  console.error('[db:restore] --file is required');
  console.error('  Example: yarn db:restore --target dev --file db/backups/my.dump');
  process.exit(1);
}

const dumpPath = path.isAbsolute(args.file) ? args.file : path.join(ROOT, args.file);
if (!fs.existsSync(dumpPath)) {
  console.error(`[db:restore] file not found: ${dumpPath}`);
  process.exit(1);
}

await restoreWithGate(ROOT, args.target, dumpPath, {
  stopApps: args.stopApps,
  noBackup: args.noBackup,
  migrateForward: false,
  action: 'RESTORE',
});
