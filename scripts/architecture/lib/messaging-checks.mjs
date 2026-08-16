import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const servicesDir = path.join(root, 'services');
const contractsDir = path.join(root, 'contracts/events');

/** @type {RegExp[]} */
const AMQP_ALLOWED_PATH_PATTERNS = [
  /[\\/]rabbitmq[\\/]/,
  /[\\/]messaging-kit[\\/]/,
  /[\\/]outbox-publisher[\\/]/,
  /[\\/]event-delivery[\\/]/,
  /[\\/]rabbitmq-lab-service[\\/]/,
];

/** @type {Map<string, string>} */
const EXPECTED_SERVICE_QUEUES = new Map([
  ['auth-service', 'auth-service.q'],
  ['users-service', 'users-service.q'],
  ['companies-service', 'companies-service.q'],
  ['company-members-service', 'company-members-service.q'],
  ['appointments-service', 'appointments-service.q'],
  ['notifications-service', 'notifications-service.q'],
  ['ai-service', 'ai-service.q'],
  ['metrics-service', 'metrics-service.q'],
]);

/**
 * @param {string} dir
 * @returns {Promise<string[]>}
 */
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

/**
 * @param {string[]} violations
 * @param {string} message
 */
function fail(violations, message) {
  violations.push(message);
}

/**
 * @param {string[]} violations
 */
async function checkAmqplibOnlyInInfrastructure(violations) {
  const files = await walkTsFiles(servicesDir);
  for (const file of files) {
    const text = await readFile(file, 'utf8');
    if (!text.includes('amqplib')) continue;
    const relative = path.relative(root, file);
    const allowed = AMQP_ALLOWED_PATH_PATTERNS.some((pattern) => pattern.test(relative));
    if (!allowed) {
      fail(violations, `amqplib import outside infrastructure: ${relative}`);
    }
  }
}

/**
 * @param {string[]} violations
 */
async function checkDomainBrokerCalls(violations) {
  const domainPattern = /[\\/](handlers|modules|http|consumer)[\\/]/;
  const brokerCall = /\.\s*(ack|nack|reject|publish|sendToQueue)\s*\(/;
  const files = await walkTsFiles(servicesDir);
  for (const file of files) {
    if (!domainPattern.test(file)) continue;
    const text = await readFile(file, 'utf8');
    if (brokerCall.test(text)) {
      fail(
        violations,
        `broker ACK/NACK/publish in business layer: ${path.relative(root, file)}`,
      );
    }
  }
}

/**
 * @returns {Promise<Set<string>>}
 */
async function listContractEventTypes() {
  const files = await readdir(contractsDir);
  return new Set(
    files
      .filter((f) => f.endsWith('.v1.json') && f !== 'envelope.v1.json')
      .map((f) => f.replace('.v1.json', '')),
  );
}

/**
 * @param {string[]} violations
 */
async function checkOutboxRoutingHasContracts(violations) {
  const contractTypes = await listContractEventTypes();
  const files = await walkTsFiles(servicesDir);
  const routingKeyPattern = /routingKey:\s*['"]([^'"]+)['"]/g;

  for (const file of files) {
    if (!file.endsWith('outbox-repository.ts') && !file.endsWith('outbox-repository.py')) continue;
    const text = await readFile(file, 'utf8');
    for (const match of text.matchAll(routingKeyPattern)) {
      const eventType = match[1];
      if (!contractTypes.has(eventType)) {
        fail(
          violations,
          `outbox routing key "${eventType}" has no contract in contracts/events (${path.relative(root, file)})`,
        );
      }
    }
    const eventRoutingBlock = text.match(/EventRouting[^=]*=\s*\{([^}]+)\}/s);
    if (eventRoutingBlock) {
      const keys = [...eventRoutingBlock[1].matchAll(/['"]([^'"]+)['"]\s*:/g)].map((m) => m[1]);
      for (const key of keys) {
        if (key.includes('.')) {
          const routingMatch = text.match(
            new RegExp(`['"]${key.replace('.', '\\.')}['"]\\s*:\\s*\\{[^}]*routingKey:\\s*['"]([^'"]+)['"]`),
          );
          if (routingMatch && routingMatch[1] !== key) {
            fail(
              violations,
              `routingKey must equal event type for ${key} in ${path.relative(root, file)}`,
            );
          }
        }
      }
    }
  }
}

/**
 * @param {string[]} violations
 */
async function checkEventCatalogMentionsContracts(violations) {
  const catalogPath = path.join(root, 'docs/architecture/event-catalog.md');
  const contractsReadmePath = path.join(contractsDir, 'README.md');
  const catalog = await readFile(catalogPath, 'utf8');
  const contractsReadme = await readFile(contractsReadmePath, 'utf8');
  const contractTypes = await listContractEventTypes();
  for (const eventType of contractTypes) {
    const documented =
      catalog.includes(eventType) ||
      catalog.includes(`${eventType}.v1.json`) ||
      contractsReadme.includes(eventType) ||
      contractsReadme.includes(`${eventType}.v1.json`);
    if (!documented) {
      fail(
        violations,
        `event "${eventType}" missing from event-catalog.md and contracts/events/README.md`,
      );
    }
  }
}

/**
 * @param {string[]} violations
 */
async function checkOutboxAndProcessedApis(violations) {
  const files = await walkTsFiles(servicesDir);
  for (const file of files) {
    const relative = path.relative(root, file);
    const text = await readFile(file, 'utf8');

    if (file.endsWith('outbox-repository.ts') && text.includes('recordOutboxEvent')) {
      if (!/recordOutboxEvent\s*\(\s*client:\s*PoolClient/.test(text)) {
        fail(violations, `recordOutboxEvent must require PoolClient first arg: ${relative}`);
      }
    }

    if (file.endsWith('processed-events-repository.ts') && text.includes('markProcessed')) {
      if (!/markProcessed\s*\(\s*client:\s*PoolClient/.test(text)) {
        fail(violations, `markProcessed must require PoolClient first arg: ${relative}`);
      }
      if (/markProcessed\s*\(\s*eventId:\s*string/.test(text)) {
        fail(violations, `unsafe markProcessed(eventId) overload must not exist: ${relative}`);
      }
    }
  }
}

/**
 * @param {string[]} violations
 */
async function checkQueueOwnership(violations) {
  const queueOwners = new Map();

  for (const [service, expectedQueue] of EXPECTED_SERVICE_QUEUES) {
    const mainTs = path.join(servicesDir, service, 'src/main.ts');
    const mainPy = path.join(servicesDir, service, 'src/main.py');
    const configPy = path.join(servicesDir, service, 'src/config.py');
    let text = '';
    try {
      text = await readFile(mainTs, 'utf8');
    } catch {
      try {
        text = await readFile(mainPy, 'utf8');
      } catch {
        try {
          text = await readFile(configPy, 'utf8');
        } catch {
          fail(violations, `consumer service missing main entry: ${service}`);
          continue;
        }
      }
    }

    let queueMatch =
      text.match(/QUEUE_NAME\s*=\s*['"]([^'"]+)['"]/) ??
      text.match(/queue\s*=\s*['"]([^'"]+)['"]/i);

    if (!queueMatch) {
      try {
        const configText = await readFile(configPy, 'utf8');
        queueMatch =
          configText.match(/QUEUE_NAME\s*=\s*['"]([^'"]+)['"]/) ??
          configText.match(/queue\s*=\s*['"]([^'"]+)['"]/i);
      } catch {
        // no config.py
      }
    }
    if (!queueMatch) {
      fail(violations, `could not find QUEUE_NAME in ${service} main entry`);
      continue;
    }

    const queue = queueMatch[1];
    if (queue !== expectedQueue) {
      fail(violations, `${service} queue mismatch: expected ${expectedQueue}, found ${queue}`);
    }

    if (queueOwners.has(queue)) {
      fail(
        violations,
        `queue "${queue}" claimed by both ${queueOwners.get(queue)} and ${service}`,
      );
    }
    queueOwners.set(queue, service);
  }
}

/**
 * @param {string[]} violations
 */
async function checkRetryTopologySourceExchange(violations) {
  const files = await walkTsFiles(servicesDir);
  for (const file of files) {
    if (!file.endsWith(`${path.sep}rabbitmq${path.sep}consumer.ts`)) continue;
    const text = await readFile(file, 'utf8');
    if (!text.includes('declareRetryTopology')) continue;

    const serviceName = path.basename(path.dirname(path.dirname(path.dirname(file))));
    const domainBindings = text.includes("sourceExchange: 'domain.events'");
    const analyticsBindings = text.includes("sourceExchange: 'analytics.events'");

    if (text.includes('domain.events') && text.includes('analytics.events') && domainBindings) {
      // dual-exchange consumers should declare retry for each source they consume
      if (!analyticsBindings) {
        fail(
          violations,
          `${serviceName} consumes analytics.events but missing declareRetryTopology for analytics.events`,
        );
      }
    }
  }
}

/**
 * @param {string[]} violations
 */
async function checkEnvelopeRequiredFields(violations) {
  const envelopePath = path.join(contractsDir, 'envelope.v1.json');
  const envelope = JSON.parse(await readFile(envelopePath, 'utf8'));
  const required = envelope.required ?? [];
  const expected = ['id', 'type', 'source', 'version', 'time', 'correlationId', 'data'];
  for (const field of expected) {
    if (!required.includes(field)) {
      fail(violations, `envelope.v1.json missing required field: ${field}`);
    }
  }
}

export async function runMessagingArchitectureChecks() {
  /** @type {string[]} */
  const violations = [];

  await checkAmqplibOnlyInInfrastructure(violations);
  await checkDomainBrokerCalls(violations);
  await checkOutboxRoutingHasContracts(violations);
  await checkEventCatalogMentionsContracts(violations);
  await checkOutboxAndProcessedApis(violations);
  await checkQueueOwnership(violations);
  await checkRetryTopologySourceExchange(violations);
  await checkEnvelopeRequiredFields(violations);

  return violations;
}
