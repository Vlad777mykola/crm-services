/**
 * Shared CLI flag parsing for db scripts.
 */

const DEFAULT_TARGET = 'dev';

/**
 * @param {string[]} argv
 */
export function parseDbCliArgs(argv) {
  const flags = new Set(argv.filter((a) => a.startsWith('--')));
  const positional = argv.filter((a) => !a.startsWith('--'));

  let target = DEFAULT_TARGET;
  for (const arg of flags) {
    if (arg.startsWith('--target=')) {
      target = arg.slice('--target='.length);
    }
  }
  const targetIdx = argv.indexOf('--target');
  if (targetIdx >= 0 && argv[targetIdx + 1]) {
    target = argv[targetIdx + 1];
  }

  return {
    target,
    noBackup: flags.has('--no-backup'),
    stopApps: flags.has('--stop-apps'),
    positional,
    flags,
    file: (() => {
      const i = argv.indexOf('--file');
      return i >= 0 ? argv[i + 1] : undefined;
    })(),
    name: (() => {
      const i = argv.indexOf('--name');
      return i >= 0 ? argv[i + 1] : undefined;
    })(),
  };
}
