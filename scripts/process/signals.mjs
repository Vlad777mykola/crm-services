/** @type {Array<() => void | Promise<void>>} */
const cleanupHandlers = [];

/** @param {() => void | Promise<void>} fn */
export function registerCleanup(fn) {
  cleanupHandlers.push(fn);
}

let registered = false;

export function registerSignalHandlers() {
  if (registered) return;
  registered = true;

  const run = async (signal) => {
    for (const fn of cleanupHandlers) {
      try {
        await fn();
      } catch (err) {
        console.error(`[cleanup] error during ${signal}:`, err);
      }
    }
  };

  process.on('SIGINT', () => {
    void run('SIGINT').finally(() => process.exit(130));
  });
  process.on('SIGTERM', () => {
    void run('SIGTERM').finally(() => process.exit(143));
  });
}

export async function runCleanup() {
  for (const fn of cleanupHandlers) {
    await fn();
  }
}
