import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const input = path.join(ROOT, 'contracts', 'openapi.yaml');
const output = path.join(ROOT, 'contracts', 'openapi.json');

execFileSync(
  process.platform === 'win32' ? 'npx.cmd' : 'npx',
  ['redocly', 'bundle', input, '-o', output],
  { cwd: ROOT, stdio: 'inherit' },
);

console.log(`[contracts:bundle] wrote ${path.relative(ROOT, output)}`);
