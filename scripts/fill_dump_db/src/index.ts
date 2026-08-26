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

function isDuplicateSeedDataError(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    'constraint' in err &&
    err.code === '23505' &&
    err.constraint === 'UQ_auth_identities_provider_provider_user_id'
  );
}

main()
  .catch((err: unknown) => {
    console.error('[fill_dump_db] failed:', err);
    if (isDuplicateSeedDataError(err)) {
      console.error(
        [
          '',
          '[fill_dump_db] seed data already exists.',
          'Use yarn db:seed:full:reset --target dev to truncate application data and reseed.',
        ].join('\n'),
      );
    }
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
