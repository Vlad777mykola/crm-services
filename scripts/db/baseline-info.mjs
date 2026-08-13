import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { gitCommit, localBaselineDumpPath, readManifest, sha256File } from './lib/baseline.mjs';
import { resolveTarget } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

const manifest = readManifest(ROOT);
const commit = gitCommit(ROOT);

console.log('Team baseline');
console.log(`  name:            ${manifest.name}`);
console.log(`  version:         ${manifest.version}`);
console.log(`  createdAt:       ${manifest.createdAt}`);
console.log(`  gitCommit:       ${manifest.gitCommit}`);
console.log(`  postgresMajor:   ${manifest.postgresMajor}`);
console.log(`  schemaVersion:   ${manifest.schemaVersion}`);
console.log(`  profile:         ${manifest.profile}`);
console.log(`  sanitized:       ${manifest.sanitized}`);
console.log(`  checksumSha256:  ${manifest.checksumSha256}`);
console.log(`  artifactFile:    ${manifest.artifactFile || '(not set)'}`);
console.log(`  artifactUrl:     ${manifest.artifactUrl || '(not set)'}`);
console.log('');
console.log(`Current git commit: ${commit}`);

const dev = resolveTarget('dev');
if (manifest.postgresMajor !== dev.postgresMajor) {
  console.log('✗ postgres major mismatch');
  process.exit(1);
}

if (manifest.gitCommit && manifest.gitCommit !== commit) {
  console.log('⚠ baseline commit differs from current code (restore will migrate forward)');
} else {
  console.log('✓ commit matches current code');
}

const dumpPath = localBaselineDumpPath(ROOT);
if (fs.existsSync(dumpPath)) {
  const local = sha256File(dumpPath);
  if (manifest.checksumSha256 && local === manifest.checksumSha256) {
    console.log('✓ local dump checksum matches manifest');
  } else {
    console.log('⚠ local dump checksum differs — run yarn db:baseline:pull');
  }
} else {
  console.log('⚠ local team-baseline.dump missing — run yarn db:baseline:pull');
}
