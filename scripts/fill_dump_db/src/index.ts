import { SHARED_TEST_PASSWORD, TEST_ACCOUNTS } from './data/credentials.js';
import { pool } from './db.js';
import { resetDatabase } from './reset.js';
import { seedDatabase } from './seed.js';

function printCredentials(): void {
  const emailWidth = Math.max(...TEST_ACCOUNTS.map((a) => a.email.length)) + 2;

  console.log('\n=== Test login credentials (password is the same for all) ===');
  console.log(`Password: ${SHARED_TEST_PASSWORD}\n`);
  for (const account of TEST_ACCOUNTS) {
    console.log(`  ${account.email.padEnd(emailWidth)} ${account.note}`);
  }
  console.log('\nFull walkthrough: scripts/fill_dump_db/README.md\n');
}

async function main(): Promise<void> {
  const shouldReset = process.argv.includes('--reset');

  if (shouldReset) {
    await resetDatabase();
  }

  await seedDatabase();
  printCredentials();
}

main()
  .catch((err: unknown) => {
    console.error('[fill_dump_db] failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
