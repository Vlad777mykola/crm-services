import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { parseDbCliArgs } from './lib/cli-args.mjs';
import { runDestructiveOperation } from './lib/destructive.mjs';
import { runFillDumpDb } from './lib/fill-dump.mjs';
import { printOperationBanner } from './lib/target.mjs';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const args = parseDbCliArgs(process.argv.slice(2));

await runDestructiveOperation(
  args.target,
  'RESET',
  async (target) => {
    printOperationBanner({ action: 'RESET', target });
    runFillDumpDb(target.name, 'reset-only');
    const { resetTargetMessaging } = await import('../state/lib/messaging-reset.mjs');
    await resetTargetMessaging(ROOT, target);
    console.log('[db:reset] complete');
  },
  { stopApps: args.stopApps },
);
