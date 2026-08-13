/** Deterministic accounts for automated tests — never used for manual dev seed. */

export const TEST_FIXTURE_PASSWORD = 'TestPassw0rd!';

export const TEST_FIXTURE_ACCOUNTS = [
  {
    email: 'test-owner@example.test',
    id: '00000000-0000-0000-0000-000000000101',
    role: 'owner',
  },
  {
    email: 'test-admin@example.test',
    id: '00000000-0000-0000-0000-000000000102',
    role: 'admin',
  },
  {
    email: 'test-user@example.test',
    id: '00000000-0000-0000-0000-000000000103',
    role: 'user',
  },
] as const;
