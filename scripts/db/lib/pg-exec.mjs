import { spawnSync } from 'node:child_process';
import fs from 'node:fs';

function dockerComposeArgs(root, parsed, subcommand) {
  const args = ['compose'];
  if (parsed.target.project) args.push('-p', parsed.target.project);
  for (const file of parsed.target.composeFiles) {
    args.push('-f', `${root}/${file}`);
  }
  args.push('exec', '-T', parsed.target.service, ...subcommand);
  return args;
}

/**
 * pg_dump custom-format archive to a local file.
 */
export function pgDumpToFile(root, parsed, outputPath) {
  const args = dockerComposeArgs(root, parsed, [
    'pg_dump',
    '-U',
    parsed.user,
    '-Fc',
    parsed.database,
  ]);

  const result = spawnSync('docker', args, {
    encoding: 'buffer',
    maxBuffer: 512 * 1024 * 1024,
  });

  if (result.status !== 0) {
    throw new Error(result.stderr?.toString() || 'pg_dump failed');
  }

  fs.writeFileSync(outputPath, result.stdout);
}

/**
 * pg_restore from a local dump file (stdin).
 */
export function pgRestoreFromFile(root, parsed, inputPath) {
  const dump = fs.readFileSync(inputPath);
  const args = dockerComposeArgs(root, parsed, [
    'pg_restore',
    '-U',
    parsed.user,
    '-d',
    parsed.database,
    '--clean',
    '--if-exists',
    '--no-owner',
    '--no-privileges',
  ]);

  const result = spawnSync('docker', args, {
    input: dump,
    encoding: 'buffer',
    maxBuffer: 64 * 1024 * 1024,
  });

  const stderr = result.stderr?.toString() || '';
  if (stderr) {
    console.warn(stderr.trim());
  }
  if (result.status !== 0 && result.status !== null) {
    throw new Error(stderr || 'pg_restore failed');
  }
}
