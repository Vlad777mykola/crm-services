/**
 * Resolve tsx CLI for workspace hoisting (avoid broken npx paths on Windows/Yarn).
 */
import { createRequire } from 'node:module';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const require = createRequire(path.join(ROOT, 'package.json'));

/** Absolute path to tsx CLI entry */
export function resolveTsxCli() {
  try {
    return require.resolve('tsx/cli');
  } catch {
    return require.resolve('tsx/dist/cli.mjs');
  }
}

/** Shell command prefix: node <tsx> (no npx) */
export function tsxCommand(entryFile) {
  const tsxCli = resolveTsxCli();
  return `node "${tsxCli}" "${entryFile}"`;
}
