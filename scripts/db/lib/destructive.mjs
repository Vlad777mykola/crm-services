/**
 * Global destructive-operation gate.
 */
import { ensureTargetIdle, stopTargetApps } from './target-idle.mjs';
import { assertSafeDatabaseTarget, resolveTarget } from './target.mjs';

/**
 * @param {string} targetName
 * @param {string} operation
 * @param {(target: ReturnType<typeof resolveTarget>) => Promise<void> | void} fn
 * @param {{ stopApps?: boolean }} [options]
 */
export async function runDestructiveOperation(targetName, operation, fn, options = {}) {
  const target = resolveTarget(targetName);
  assertSafeDatabaseTarget(target, operation);

  if (options.stopApps) {
    await stopTargetApps(target);
  }

  await ensureTargetIdle(target);

  await fn(target);
}
