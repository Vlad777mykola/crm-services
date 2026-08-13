import { parseDbCliArgs } from './lib/cli-args.mjs';
import { runFillDumpDb } from './lib/fill-dump.mjs';
import { printOperationBanner, resolveTarget } from './lib/target.mjs';

const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

printOperationBanner({ action: 'MIGRATE', target });
runFillDumpDb(target.name, 'migrate');
