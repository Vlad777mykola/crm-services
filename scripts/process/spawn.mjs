import { spawn } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const PID_FILE = path.resolve('.dev/pids.json');

/** @typedef {{ name: string; pid: number; rootPid: number }} TrackedProcess */

/** @returns {TrackedProcess[]} */
export function readTrackedPids() {
  try {
    const raw = fs.readFileSync(PID_FILE, 'utf8');
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

/** @param {TrackedProcess[]} entries */
export function writeTrackedPids(entries) {
  fs.mkdirSync(path.dirname(PID_FILE), { recursive: true });
  fs.writeFileSync(PID_FILE, JSON.stringify(entries, null, 2));
}

/** @param {TrackedProcess} entry */
export function appendTrackedPid(entry) {
  const entries = readTrackedPids();
  entries.push(entry);
  writeTrackedPids(entries);
}

/** @param {string} name */
export function removeTrackedPid(name) {
  writeTrackedPids(readTrackedPids().filter((e) => e.name !== name));
}

/**
 * Spawn a long-running process and track its PID.
 * @param {{ name: string; command: string; cwd: string; env?: Record<string, string>; stdio?: 'inherit' | 'ignore' }} opts
 */
export function spawnTracked(opts) {
  const isWin = process.platform === 'win32';
  const stdio = opts.stdio ?? 'ignore';
  const child = spawn(isWin ? 'cmd.exe' : 'sh', isWin ? ['/c', opts.command] : ['-c', opts.command], {
    cwd: opts.cwd,
    env: { ...process.env, ...opts.env },
    detached: !isWin,
    stdio,
    windowsHide: stdio === 'ignore',
  });

  if (!child.pid) {
    throw new Error(`Failed to spawn ${opts.name}`);
  }

  appendTrackedPid({ name: opts.name, pid: child.pid, rootPid: child.pid });
  child.unref();
  return child;
}

export function clearTrackedPids() {
  try {
    fs.unlinkSync(PID_FILE);
  } catch {
    // ignore
  }
}
