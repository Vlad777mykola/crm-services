import { parseDbCliArgs } from './lib/cli-args.mjs';
import { runFillDumpDb } from './lib/fill-dump.mjs';
import { assertDevelopmentDataTarget, printOperationBanner, resolveTarget } from './lib/target.mjs';

const args = parseDbCliArgs(process.argv.slice(2));
const target = resolveTarget(args.target);

assertDevelopmentDataTarget(target, 'db:bootstrap:legacy');
printOperationBanner({ action: 'MIGRATE', target });
runFillDumpDb(target.name, 'migrate');
