import { randomUUID } from 'node:crypto';

import { query } from './db.js';

/**
 * Generic single-row insert - every table this script touches has a uuid
 * `id` primary key, so one helper covers all of them instead of hand-writing
 * an INSERT per table. Returns the id (the one passed in `values.id`, or a
 * freshly generated one if omitted).
 */
export async function insert(table: string, values: Record<string, unknown>): Promise<string> {
  const id = (values.id as string | undefined) ?? randomUUID();
  const row = { ...values, id };
  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`);

  await query(
    `INSERT INTO "${table}" (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`,
    Object.values(row),
  );

  return id;
}

export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
