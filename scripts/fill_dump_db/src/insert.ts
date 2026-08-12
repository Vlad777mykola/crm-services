import { randomUUID } from 'node:crypto';

import { query } from './db.js';

/**
 * Generic single-row insert into a public-schema table - every legacy table this
 * script touches has a uuid `id` primary key.
 */
export async function insert(table: string, values: Record<string, unknown>): Promise<string> {
  return insertQualified('public', table, values);
}

/**
 * Insert into a schema-qualified table (e.g. companies_schema.companies).
 */
export async function insertQualified(
  schema: string,
  table: string,
  values: Record<string, unknown>,
): Promise<string> {
  const id = (values.id as string | undefined) ?? randomUUID();
  const row = { ...values, id };
  const columns = Object.keys(row);
  const placeholders = columns.map((_, i) => `$${i + 1}`);
  const qualified = `"${schema}"."${table}"`;

  await query(
    `INSERT INTO ${qualified} (${columns.map((c) => `"${c}"`).join(', ')}) VALUES (${placeholders.join(', ')})`,
    Object.values(row),
  );

  return id;
}

export function daysFromNow(days: number): Date {
  const date = new Date();
  date.setDate(date.getDate() + days);
  return date;
}
