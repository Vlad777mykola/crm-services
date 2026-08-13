import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { restoreWithGate } from './lib/restore-pipeline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseDbCliArgs(process.argv.slice(2));

const dumpPath = path.join(ROOT, 'db/baseline/team-baseline.dump');
if (!fs.existsSync(dumpPath)) {
  console.error('[db:baseline:restore] team-baseline.dump not found. Run: yarn db:baseline:pull');
  process.exit(1);
}

const { readManifest, sha256File } = await import('./lib/baseline.mjs');
const manifest = readManifest(ROOT);
const checksum = sha256File(dumpPath);
if (manifest.checksumSha256 && checksum !== manifest.checksumSha256) {
  console.error('[db:baseline:restore] checksum mismatch');
  process.exit(1);
}

await restoreWithGate(ROOT, args.target, dumpPath, {
  stopApps: args.stopApps,
  noBackup: args.noBackup,
  migrateForward: true,
  action: 'BASELINE_RESTORE',
});
