import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  gitCommit,
  localBaselineDumpPath,
  sha256File,
  writeManifest,
} from './lib/baseline.mjs';
import { runDestructiveOperation } from './lib/destructive.mjs';
import { dropAndRecreateDatabase, pgDumpToFile } from './lib/pg-exec.mjs';
import { runFillDumpDb } from './lib/fill-dump.mjs';
import { resolveTarget } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const VERIFY = 'verify';

async function ensureVerifyInfra() {
  const compose = path.join(ROOT, 'docker/verify/compose.yml');
  execSync(`docker compose -p crm-verify -f "${compose}" up -d --wait`, {
    cwd: ROOT,
    stdio: 'inherit',
  });
}

await runDestructiveOperation(
  VERIFY,
  'BASELINE_CREATE',
  async (target) => {
    console.log('[db:baseline:create] starting isolated verify baseline pipeline…');
    await ensureVerifyInfra();

    dropAndRecreateDatabase(ROOT, target);

    runFillDumpDb(VERIFY, 'migrate');
    runFillDumpDb(VERIFY, 'seed');
    runFillDumpDb(VERIFY, 'baseline-prep');

    const baselineDir = path.join(ROOT, 'db/baseline');
    if (!fs.existsSync(baselineDir)) fs.mkdirSync(baselineDir, { recursive: true });

    const dumpPath = localBaselineDumpPath(ROOT);
    pgDumpToFile(ROOT, target, dumpPath);

    const commit = gitCommit(ROOT);
    const { readManifest } = await import('./lib/baseline.mjs');
    let version = 1;
    try {
      const prev = readManifest(ROOT);
      version = (prev.version ?? 0) + 1;
    } catch {
      // first baseline
    }

    const checksum = sha256File(dumpPath);
    const shortCommit = commit.slice(0, 7);
    const artifactFile = `dev-baseline-v${version}-${shortCommit}.dump`;

    const manifest = {
      name: 'dev-baseline',
      version,
      createdAt: new Date().toISOString(),
      gitCommit: commit,
      postgresMajor: target.postgresMajor,
      schemaVersion: commit,
      profile: 'full',
      sanitized: true,
      containsRealUserData: false,
      checksumSha256: checksum,
      dumpFile: 'team-baseline.dump',
      artifactFile,
      artifactUrl: '',
    };

    writeManifest(ROOT, manifest);

    console.log(`[db:baseline:create] dump → ${path.relative(ROOT, dumpPath)}`);
    console.log(`[db:baseline:create] publish as ${artifactFile} and set manifest.artifactUrl`);
    console.log(`[db:baseline:create] checksum ${checksum}`);
  },
  { stopApps: true },
);
