import { pool } from './db.js';
import { resetDatabase } from './reset.js';

await resetDatabase();
await pool.end();
console.log('[db:reset] truncate complete');
