import bcrypt from 'bcryptjs';

import { TEST_FIXTURE_ACCOUNTS, TEST_FIXTURE_PASSWORD } from './data/test-fixtures.js';
import { pool } from './db.js';
import { insertQualified, insertRow } from './insert.js';
import { resetDatabase } from './reset.js';
import { seedMinimalPublishedCompanies } from './seed-microservices.js';

const BCRYPT_SALT_ROUNDS = 10;

async function seedTestUsers(): Promise<void> {
  const passwordHash = await bcrypt.hash(TEST_FIXTURE_PASSWORD, BCRYPT_SALT_ROUNDS);

  for (const account of TEST_FIXTURE_ACCOUNTS) {
    await insertQualified('auth_schema', 'auth_identities', {
      id: account.id,
      provider: 'password',
      providerUserId: account.email,
      email: account.email,
      passwordHash,
    });
    await insertQualified('users_schema', 'users', {
      id: account.id,
      email: account.email,
      status: 'active',
    });
    await insertRow('users_schema', 'user_profiles', {
      userId: account.id,
      name: `Test ${account.role}`,
    });
  }

  console.log(`[seed:test] ${TEST_FIXTURE_ACCOUNTS.length} deterministic test users`);
}

async function main(): Promise<void> {
  await resetDatabase();
  await seedMinimalPublishedCompanies();
  await seedTestUsers();
  console.log(
    '\n[seed:test] Done. Test gateway http://localhost:18080/companies/public (DB :15432).\n',
  );
}

main()
  .catch((err: unknown) => {
    console.error('[fill_dump_db] seed:test failed:', err);
    process.exitCode = 1;
  })
  .finally(() => {
    void pool.end();
  });
