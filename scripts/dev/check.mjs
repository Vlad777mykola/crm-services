import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');

function fail(msg) {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

console.log('Local environment\n');

const nodeVersion = process.version;
const major = Number(nodeVersion.slice(1).split('.')[0]);
if (major < 22) {
  fail(`Node 22+ required (found ${nodeVersion})`);
}
console.log(`✓ Node ${nodeVersion}`);

if (!fs.existsSync(path.join(ROOT, 'node_modules'))) {
  fail('dependencies not installed — run yarn install');
}
console.log('✓ dependencies installed');

try {
  execSync('docker info', { stdio: 'ignore' });
  console.log('✓ Docker available');
} catch {
  fail('Docker daemon not reachable');
}

console.log('\nStatic prerequisites OK (infra not required for check).');
