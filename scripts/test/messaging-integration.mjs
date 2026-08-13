#!/usr/bin/env node
/**
 * Messaging failure matrix integration harness (RFC1 step 12).
 * Requires USERS_INTEGRATION_TEST=1 and running postgres/rabbit for full run.
 */
import { spawn } from 'node:child_process';

const scenarios = [
  'consumer rollback (users-service integration test)',
  'duplicate delivery skip',
  'publisher concurrent claim (outbox-publisher unit)',
  'contract validation CI',
];

console.log('[messaging-integration] matrix:');
for (const scenario of scenarios) {
  console.log(` - ${scenario}`);
}

function run(cmd, args, env = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, { stdio: 'inherit', shell: true, env: { ...process.env, ...env } });
    child.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(`${cmd} exited ${code}`))));
  });
}

async function main() {
  await run('node', ['scripts/ci/validate-event-contracts.mjs']);
  await run('yarn', ['workspace', '@crm/outbox-publisher', 'test']);
  if (process.env.USERS_INTEGRATION_TEST === '1') {
    await run('yarn', ['workspace', '@crm/users-service', 'test'], { USERS_INTEGRATION_TEST: '1' });
  } else {
    console.log('[messaging-integration] skip users DB tests (set USERS_INTEGRATION_TEST=1 to enable)');
  }
  console.log('[messaging-integration] completed');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
