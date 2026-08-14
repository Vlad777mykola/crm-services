#!/usr/bin/env node
/**
 * Guardrails specific to services/rabbitmq-lab-service (student/dev-only).
 * Complements the generic `no-cross-service-imports` dependency-cruiser rule
 * with the lab's own hard safety boundary:
 *
 *   - must not import another service's src/**
 *   - every literal name passed to assertExchange/assertQueue/channel.publish
 *     inside src/rabbitmq or src/labs must be student.rabbitmq-lab.* (the
 *     only exception is binding a lab queue to a real domain exchange for
 *     read-only observation, which uses bindQueue/bindStudentQueue, not
 *     assert/publish)
 *
 * This is a best-effort text-level check (like scripts/architecture/lib/
 * messaging-checks.mjs), not a full static analyzer - it catches literal
 * string mistakes, not every possible dynamic construction.
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const serviceDir = path.join(root, 'services/rabbitmq-lab-service');
const STUDENT_PREFIX = 'student.rabbitmq-lab.';
const REAL_DOMAIN_EXCHANGES = ['domain.events', 'analytics.events', 'commands', 'domain.events.dlx', 'commands.dlx'];

/** @param {string} dir @returns {Promise<string[]>} */
async function walkTsFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      files.push(...(await walkTsFiles(full)));
      continue;
    }
    if (entry.name.endsWith('.ts') && !entry.name.endsWith('.test.ts')) {
      files.push(full);
    }
  }
  return files;
}

/** @param {string[]} violations @param {string} message */
function fail(violations, message) {
  violations.push(message);
}

/** @param {string[]} violations */
async function checkNoCrossServiceImports(violations) {
  const files = await walkTsFiles(serviceDir);
  const importPattern = /from\s+['"]([^'"]+)['"]/g;
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(importPattern)) {
      const target = match[1];
      if (/^\.\.\/\.\.\/(?!rabbitmq-lab-service)[^/]+\/src\//.test(target) || /^services\/(?!rabbitmq-lab-service)[^/]+\/src\//.test(target)) {
        fail(violations, `${path.relative(root, file)} imports another service's src/ ("${target}")`);
      }
    }
  }
}

/**
 * Flags any literal exchange/queue name used with assertExchange, assertQueue,
 * or channel.publish that is neither student-namespaced nor (for
 * assert/publish only - never for bind) empty string ("" - the default
 * exchange, whose companion routing key must itself be a student queue name
 * and is checked separately by the guarded helpers at runtime).
 * @param {string[]} violations
 */
async function checkNamespaceLiterals(violations) {
  const files = await walkTsFiles(path.join(serviceDir, 'src'));
  const literalCallPattern = /\.(assertExchange|assertQueue)\s*\(\s*['"]([^'"]*)['"]/g;
  const publishCallPattern = /\.publish\s*\(\s*['"]([^'"]*)['"]/g;

  for (const file of files) {
    const relative = path.relative(root, file);
    // rabbitmq/names.ts and rabbitmq/channel.ts define/enforce the guard - they
    // legitimately mention real exchange names as string literals (allow-list),
    // not as places that declare/publish to them.
    if (relative.endsWith(`rabbitmq${path.sep}names.ts`)) continue;
    if (relative.endsWith(`rabbitmq${path.sep}channel.ts`)) continue;

    const text = await readFile(file, 'utf8');

    for (const match of text.matchAll(literalCallPattern)) {
      const name = match[2];
      if (name.length === 0) continue; // not a valid exchange/queue name anyway
      if (!name.startsWith(STUDENT_PREFIX)) {
        fail(violations, `${relative}: assert call on non-student name "${name}"`);
      }
    }

    for (const match of text.matchAll(publishCallPattern)) {
      const name = match[1];
      if (name === '') continue; // default exchange - guarded by publishToDefaultExchange at runtime
      if (REAL_DOMAIN_EXCHANGES.includes(name)) {
        fail(violations, `${relative}: publish call targets a real domain exchange "${name}" directly`);
      }
    }
  }
}

/** @param {string[]} violations */
async function checkDocsExist(violations) {
  const required = [
    'docs/students/rabitmq/lab-service/START-HERE.md',
    'docs/students/rabitmq/lab-service/GRADUATION-CHECKLIST.md',
    'docs/students/rabitmq/lab-service/01-setup.md',
    'docs/students/rabitmq/lab-service/05-publish-and-subscribe.md',
    'docs/students/rabitmq/services/rabbitmq-lab-service/README.md',
  ];
  const { access } = await import('node:fs/promises');
  for (const file of required) {
    try {
      await access(path.join(root, file));
    } catch {
      fail(violations, `missing required doc: ${file}`);
    }
  }
}

async function main() {
  /** @type {string[]} */
  const violations = [];
  await checkNoCrossServiceImports(violations);
  await checkNamespaceLiterals(violations);
  await checkDocsExist(violations);

  if (violations.length > 0) {
    console.error('[check-rabbitmq-lab] violations:\n');
    for (const violation of violations) {
      console.error(`  - ${violation}`);
    }
    process.exit(1);
  }
  console.log('[check-rabbitmq-lab] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
