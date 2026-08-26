export function yarnCommand(args) {
  return process.platform === 'win32'
    ? { command: 'cmd', args: ['/c', 'yarn', ...args] }
    : { command: 'yarn', args };
}
