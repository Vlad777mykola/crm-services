import { resetDatabase } from './reset.ts';
import { pool } from './db.ts';

await resetDatabase();
await pool.end();
console.log('[db:reset] truncate complete');