import { pool } from './db.js';

export async function assertRequiredTablesExist(requiredTables: string[]): Promise<void> {
  const missing: string[] = [];

  for (const table of requiredTables) {
    const { rows } = await pool.query(`SELECT to_regclass($1::text) IS NOT NULL AS ok`, [table]);
    if (!rows[0]?.ok) missing.push(table);
  }

  if (missing.length > 0) {
    throw new Error(
      [
        '[fill_dump_db] required table(s) are missing:',
        ...missing.map((table) => `  - ${table}`),
        'Run yarn db:migrate for the target database before seeding.',
      ].join('\n'),
    );
  }
}
