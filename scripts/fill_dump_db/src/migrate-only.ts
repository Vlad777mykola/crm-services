import { ensureAllMicroserviceSchemas } from './ensure-schemas.ts';
import { pool } from './db.ts';

await ensureAllMicroserviceSchemas();
await pool.end();
console.log('[db:migrate] schemas applied');
