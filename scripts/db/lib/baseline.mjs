import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { execSync } from 'node:child_process';

import { BASELINE_LOCAL_DUMP } from './target.mjs';

export const BASELINE_DIR_REL = 'db/baseline';

/**
 * @param {string} root
 */
export function baselineDir(root) {
  return path.join(root, BASELINE_DIR_REL);
}

/**
 * @param {string} root
 */
export function readManifest(root) {
  const manifestPath = path.join(baselineDir(root), 'manifest.json');
  if (!fs.existsSync(manifestPath)) {
    throw new Error(`manifest not found: ${manifestPath}`);
  }
  return JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
}

/**
 * @param {string} filePath
 */
export function sha256File(filePath) {
  const hash = createHash('sha256');
  hash.update(fs.readFileSync(filePath));
  return hash.digest('hex');
}

/**
 * @param {string} root
 */
export function gitCommit(root) {
  try {
    return execSync('git rev-parse HEAD', { cwd: root, encoding: 'utf8' }).trim();
  } catch {
    return 'unknown';
  }
}

/**
 * @param {string} root
 * @param {object} manifest
 */
export function writeManifest(root, manifest) {
  const dir = baselineDir(root);
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}

/**
 * @param {string} root
 */
export function localBaselineDumpPath(root) {
  return path.join(baselineDir(root), BASELINE_LOCAL_DUMP);
}
