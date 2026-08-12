import { pool } from './db.js';
import { resetMicroserviceSchemas } from './reset.js';
import { seedMinimalPublishedCompanies } from './seed-microservices.js';

async function main(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  if (shouldReset) {
    await resetMicroserviceSchemas();
  }

  await seedMinimalPublishedCompanies();

  console.log('\nDone. Refresh http://localhost:5173/companies (gateway :8080, companies-service :4003).\n');
}

main()
  .catch((err: unknown) => {
    console.error('[fill_dump_db] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
