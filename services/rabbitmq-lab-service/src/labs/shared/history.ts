/** Small bounded in-memory ring buffer shared by every lab's "what did I receive" state. */
export interface HistoryEntry<T> {
  entry: T;
  receivedAt: string;
}

export interface History<T> {
  record: (entry: T) => void;
  list: () => HistoryEntry<T>[];
}

export function createHistory<T>(max = 20): History<T> {
  let items: HistoryEntry<T>[] = [];
  return {
    record(entry: T): void {
      items = [{ entry, receivedAt: new Date().toISOString() }, ...items].slice(0, max);
    },
    list(): HistoryEntry<T>[] {
      return items;
    },
  };
}
