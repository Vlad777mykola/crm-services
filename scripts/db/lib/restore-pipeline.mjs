/**
 * Shared restore pipeline pieces.
 */
import fs from 'node:fs';
import path from 'node:path';

import { runDestructiveOperation } from './destructive.mjs';
import {
  dropAndRecreateDatabase,
  pgRestoreFromFile,
  pgDumpToFile,
  verifyDatabaseConnect,
} from './pg-exec.mjs';
import { printOperationBanner } from './target.mjs';

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {{ noBackup?: boolean }} opts
 */
export function autoBackupBeforeRestore(root, target, opts = {}) {
  if (opts.noBackup) return null;

  const backupsDir = path.join(root, 'db/backups');
  if (!fs.existsSync(backupsDir)) {
    fs.mkdirSync(backupsDir, { recursive: true });
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const filename = `${target.name}-auto-before-restore-${stamp}.dump`;
  const outPath = path.join(backupsDir, filename);

  console.log(`[db] auto-backup before restore → ${outPath}`);
  pgDumpToFile(root, target, outPath);
  return outPath;
}

/**
 * @param {string} root
 * @param {ReturnType<typeof import('./target.mjs').resolveTarget>} target
 * @param {string} dumpPath
 * @param {{ action?: string; migrateForward?: boolean; noBackup?: boolean }} opts
 */
export async function runFullRestore(root, target, dumpPath, opts = {}) {
  const { resetTargetMessaging } = await import('../../state/lib/messaging-reset.mjs');
  const action = opts.action ?? 'RESTORE';

  printOperationBanner({ action, target, source: dumpPath });
  autoBackupBeforeRestore(root, target, { noBackup: opts.noBackup });

  dropAndRecreateDatabase(root, target);
  pgRestoreFromFile(root, target, dumpPath);
  await resetTargetMessaging(root, target);

  if (opts.migrateForward) {
    const { execSync } = await import('node:child_process');
    console.log(`[db] migrate forward on ${target.name}`);
    execSync(`node scripts/db/migrate.mjs --target ${target.name}`, {
      cwd: root,
      stdio: 'inherit',
    });
  }

  verifyDatabaseConnect(root, target);
  console.log(`[db] restore complete (${target.name})`);
}

/**
 * @param {string} root
 * @param {string} targetName
 * @param {string} dumpPath
 * @param {{ stopApps?: boolean; noBackup?: boolean; migrateForward?: boolean; action?: string }} opts
 */
export async function restoreWithGate(root, targetName, dumpPath, opts = {}) {
  await runDestructiveOperation(
    targetName,
    opts.action ?? 'RESTORE',
    async (target) => {
      await runFullRestore(root, target, dumpPath, {
        noBackup: opts.noBackup,
        migrateForward: opts.migrateForward ?? false,
        action: opts.action,
      });
    },
    { stopApps: opts.stopApps },
  );
}
