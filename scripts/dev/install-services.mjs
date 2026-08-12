import { spawnSync } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { SERVICES } from './bundles.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

/** Extra standalone folders under services/ not in SERVICES (workers share one outbox image). */
const EXTRA_DIRS = ['services/outbox-publisher', 'services/metrics-service', 'services/ai-service'];

const dirs = [
  ...Object.values(SERVICES).map((s) => s.dir),
  ...EXTRA_DIRS,
];

let failed = false;

for (const rel of dirs) {
  const cwd = path.join(ROOT, rel);
  const pkg = path.join(cwd, 'package.json');
  if (!existsSync(pkg)) {
    console.warn(`[install-services] skip ${rel} (no package.json)`);
    continue;
  }
  console.log(`[install-services] yarn install in ${rel}`);
  const result = spawnSync('yarn', ['install'], { cwd, stdio: 'inherit', shell: true });
  if (result.status !== 0) {
    failed = true;
    console.error(`[install-services] failed: ${rel}`);
  }
}

if (failed) {
  process.exitCode = 1;
} else {
  console.log('[install-services] done');
}
