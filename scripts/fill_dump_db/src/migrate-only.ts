import { pool } from './db.js';
import { ensureAllMicroserviceSchemas } from './ensure-schemas.js';

await ensureAllMicroserviceSchemas();
await pool.end();
console.log('[db:migrate] schemas applied');
