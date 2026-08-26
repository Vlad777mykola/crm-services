import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import express from 'express';
import swaggerUi from 'swagger-ui-express';

import { env } from './env.js';

const REPO_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..', '..');
const OPENAPI_JSON = path.join(REPO_ROOT, 'contracts', 'openapi.json');

function loadSpec(): Record<string, unknown> {
  if (!fs.existsSync(OPENAPI_JSON)) {
    throw new Error(`Missing ${OPENAPI_JSON}. Run: yarn contracts:bundle`);
  }

  const spec = JSON.parse(fs.readFileSync(OPENAPI_JSON, 'utf8')) as Record<string, unknown>;
  spec.servers = [{ url: env.GATEWAY_URL }];
  return spec;
}

export function createApp(): express.Express {
  const app = express();
  const spec = loadSpec();
  const docsPath = env.DOCS_PATH;

  app.get('/health/live', (_req, res) => {
    res.json({ status: 'ok' });
  });

  app.get(`${docsPath}/openapi.json`, (_req, res) => {
    res.json(spec);
  });

  app.use(
    docsPath,
    swaggerUi.serve,
    swaggerUi.setup(undefined, {
      swaggerOptions: {
        url: `${docsPath}/openapi.json`,
      },
      customSiteTitle: 'CRM Services API',
    }),
  );

  app.get(docsPath, (_req, res) => {
    res.redirect(301, `${docsPath}/`);
  });

  return app;
}
