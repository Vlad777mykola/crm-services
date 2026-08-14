#!/usr/bin/env node
/**
 * Static messaging architecture gate (ARCH-3).
 * Complements ESLint + dependency-cruiser with repo-wide contract checks.
 */
import { runMessagingArchitectureChecks } from './lib/messaging-checks.mjs';

async function main() {
  const violations = await runMessagingArchitectureChecks();
  if (violations.length > 0) {
    console.error('[check-messaging] architecture violations:\n');
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log('[check-messaging] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
