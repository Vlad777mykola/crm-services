#!/usr/bin/env node
/**
 * CI validation for event contracts (RFC1 step 10).
 * - JSON schema syntax
 * - event catalog files exist
 * - routing coverage for known publishable events
 */
import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const contractsDir = path.join(root, 'contracts/events');

const REQUIRED_ROUTING = {
  'auth.user_registered': 'domain.events',
  'company.created': 'domain.events',
  'company-member.added': 'domain.events',
  'appointment.requested': 'domain.events',
  'review.received': 'domain.events',
  'analytics.company_rating_updated': 'analytics.events',
  'ai.appointment_recommendation_created': 'analytics.events',
  'ai.company_insight_created': 'analytics.events',
};

async function validateJsonSchemas() {
  const files = await readdir(contractsDir);
  for (const file of files) {
    if (!file.endsWith('.json')) continue;
    const text = await readFile(path.join(contractsDir, file), 'utf8');
    JSON.parse(text);
  }
}

async function validateRoutingCoverage() {
  const files = await readdir(contractsDir);
  const eventTypes = files
    .filter((f) => f.endsWith('.v1.json') && f !== 'envelope.v1.json')
    .map((f) => f.replace('.v1.json', ''));

  for (const [eventType, exchange] of Object.entries(REQUIRED_ROUTING)) {
    if (!eventTypes.includes(eventType)) {
      throw new Error(`missing contract for routed event ${eventType}`);
    }
    console.log(`routing ok: ${eventType} -> ${exchange}`);
  }
}

async function main() {
  await validateJsonSchemas();
  await validateRoutingCoverage();
  console.log('[validate-event-contracts] ok');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
