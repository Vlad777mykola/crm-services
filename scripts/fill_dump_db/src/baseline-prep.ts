import { clearTransientState } from './clear-transient.js';
import { sanitizeBaselineData } from './sanitize-baseline.js';
import { validateBaselineState } from './baseline-validate.js';
import { pool } from './db.js';

await sanitizeBaselineData();
await clearTransientState();
await validateBaselineState();
await pool.end();
