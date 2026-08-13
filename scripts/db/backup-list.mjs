import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const BACKUPS_DIR = path.join(ROOT, 'db/backups');

if (!fs.existsSync(BACKUPS_DIR)) {
  console.log('[db:backup:list] no backups directory');
  process.exit(0);
}

const dumps = fs
  .readdirSync(BACKUPS_DIR)
  .filter((f) => f.endsWith('.dump'))
  .map((f) => {
    const full = path.join(BACKUPS_DIR, f);
    const stat = fs.statSync(full);
    return { name: f, size: stat.size, mtime: stat.mtime };
  })
  .sort((a, b) => b.mtime.getTime() - a.mtime.getTime());

if (dumps.length === 0) {
  console.log('[db:backup:list] no backups');
  process.exit(0);
}

for (const d of dumps) {
  const mb = (d.size / (1024 * 1024)).toFixed(1);
  const when = d.mtime.toISOString().slice(0, 16).replace('T', ' ');
  console.log(`${d.name.padEnd(48)} ${mb.padStart(5)} MB  ${when}`);
}
