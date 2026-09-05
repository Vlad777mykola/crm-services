import { useSyncExternalStore } from 'react';

/**
 * The wall clock is external, mutable state, so reading it with `Date.now()`
 * during render makes a component non-idempotent. Subscribing to it instead
 * keeps render pure and re-renders callers when the value they compared
 * against has actually moved on.
 */
const DEFAULT_INTERVAL_MS = 60_000;

function createClock(intervalMs: number) {
  let snapshot = Date.now();
  const listeners = new Set<() => void>();
  let timer: ReturnType<typeof setInterval> | undefined;

  function subscribe(listener: () => void): () => void {
    listeners.add(listener);
    timer ??= setInterval(() => {
      snapshot = Date.now();
      for (const notify of listeners) notify();
    }, intervalMs);

    return () => {
      listeners.delete(listener);
      if (listeners.size === 0 && timer !== undefined) {
        clearInterval(timer);
        timer = undefined;
      }
    };
  }

  return {
    subscribe,
    getSnapshot: () => snapshot,
  };
}

const clocks = new Map<number, ReturnType<typeof createClock>>();

/** Current epoch milliseconds, refreshed on an interval (default: every minute). */
export function useNow(intervalMs: number = DEFAULT_INTERVAL_MS): number {
  let clock = clocks.get(intervalMs);
  if (!clock) {
    clock = createClock(intervalMs);
    clocks.set(intervalMs, clock);
  }
  return useSyncExternalStore(clock.subscribe, clock.getSnapshot);
}
