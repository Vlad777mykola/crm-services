import 'dotenv/config';

import { Pool } from 'pg';

const DATABASE_URL = process.env.DATABASE_URL ?? 'postgres://postgres:postgres@localhost:5432/crm';

export const pool = new Pool({ connectionString: DATABASE_URL });

/** Thin wrapper so call sites read like plain SQL instead of `pool.query(...)`. */
export async function query<T extends Record<string, unknown> = Record<string, unknown>>(
  text: string,
  params: unknown[] = [],
): Promise<T[]> {
  const result = await pool.query<T>(text, params);
  return result.rows;
}
