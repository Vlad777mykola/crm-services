/**
 * Run unit tests across workspace packages (no Docker).
 */
import { execSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const SERVICES_DIR = path.join(ROOT, 'services');
const TEST_FILE_PATTERN = /\.(test|spec)\.(c|m)?[jt]sx?$/;

/**
 * @param {string} dir
 * @returns {boolean}
 */
function hasTestFiles(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === 'node_modules' || entry.name === 'dist') continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (hasTestFiles(full)) return true;
      continue;
    }
    if (TEST_FILE_PATTERN.test(entry.name)) return true;
  }
  return false;
}

let failed = false;

for (const name of fs.readdirSync(SERVICES_DIR).sort()) {
  const dir = path.join(SERVICES_DIR, name);
  const pkgPath = path.join(dir, 'package.json');
  if (!fs.existsSync(pkgPath)) continue;

  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
  if (!pkg.scripts?.test) continue;

  if (!hasTestFiles(dir)) {
    console.log(`[test:unit] ${name} (no tests, skipping)`);
    continue;
  }

  console.log(`[test:unit] ${name}`);
  try {
    execSync('yarn test', { cwd: dir, stdio: 'inherit' });
  } catch {
    console.warn(`[test:unit] ${name} failed or skipped`);
    failed = true;
  }
}

if (failed) {
  console.error('[test:unit] one or more service tests failed');
  process.exit(1);
}

console.log('[test:unit] done');
