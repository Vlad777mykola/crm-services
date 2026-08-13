import { execSync } from 'node:child_process';

/**
 * Terminate a process and its children (Windows: taskkill /T).
 * @param {number} pid
 */
export function terminateTree(pid) {
  if (!pid || pid <= 0) return;

  try {
    if (process.platform === 'win32') {
      execSync(`taskkill /PID ${pid} /T /F`, { stdio: 'ignore' });
    } else {
      try {
        process.kill(-pid, 'SIGTERM');
      } catch {
        process.kill(pid, 'SIGTERM');
      }
      setTimeout(() => {
        try {
          process.kill(-pid, 'SIGKILL');
        } catch {
          try {
            process.kill(pid, 'SIGKILL');
          } catch {
            // already dead
          }
        }
      }, 2000);
    }
  } catch {
    // process may already be gone
  }
}
