import { createApp } from './app.js';
import { env } from './env.js';

const SERVICE_NAME = 'openapi-docs-service';

if (env.NODE_ENV === 'production') {
  console.error(`[${SERVICE_NAME}] dev-only — refusing to start in production`);
  process.exit(1);
}

const app = createApp();

app.listen(env.PORT, () => {
  console.log(`[${SERVICE_NAME}] Swagger UI (via gateway): http://localhost:8080${env.DOCS_PATH}/`);
  console.log(`[${SERVICE_NAME}] Swagger UI (direct): http://localhost:${env.PORT}${env.DOCS_PATH}/`);
});
