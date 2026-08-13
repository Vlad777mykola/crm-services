import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import {
  baselineDir,
  gitCommit,
  localBaselineDumpPath,
  readManifest,
  sha256File,
  writeManifest,
} from './lib/baseline.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const manifest = readManifest(ROOT);
const artifactUrl =
  process.env.BASELINE_ARTIFACT_URL ||
  manifest.artifactUrl ||
  (() => {
    const artifactPath = path.join(baselineDir(ROOT), 'artifact.json');
    if (!fs.existsSync(artifactPath)) return null;
    const artifact = JSON.parse(fs.readFileSync(artifactPath, 'utf8'));
    return artifact.urlTemplate || null;
  })();

if (!artifactUrl) {
  console.error('[db:baseline:pull] no artifact URL — set manifest.artifactUrl or BASELINE_ARTIFACT_URL');
  process.exit(1);
}

const outPath = localBaselineDumpPath(ROOT);
const dir = baselineDir(ROOT);
if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });

if (fs.existsSync(outPath) && manifest.checksumSha256) {
  const existing = sha256File(outPath);
  if (existing === manifest.checksumSha256) {
    console.log('[db:baseline:pull] local dump already matches checksum — skipping download');
    process.exit(0);
  }
}

console.log(`[db:baseline:pull] downloading from ${artifactUrl}`);
const res = await fetch(artifactUrl);
if (!res.ok) {
  throw new Error(`download failed: ${res.status} ${res.statusText}`);
}

const buffer = Buffer.from(await res.arrayBuffer());
fs.writeFileSync(outPath, buffer);

const checksum = sha256File(outPath);
if (manifest.checksumSha256 && checksum !== manifest.checksumSha256) {
  console.error('[db:baseline:pull] checksum mismatch after download');
  process.exit(1);
}

console.log(`[db:baseline:pull] wrote ${(buffer.length / 1024).toFixed(1)} KiB → db/baseline/team-baseline.dump`);
console.log(`[db:baseline:pull] checksum ${checksum}`);
