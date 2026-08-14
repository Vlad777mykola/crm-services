/**
 * The hard safety boundary for this service (see
 * docs/students/rabitmq/lab-service/START-HERE.md, "Hard safety boundary"):
 *
 *   LAB WRITES  -> student.rabbitmq-lab.* only
 *   LAB READS   -> student.rabbitmq-lab.* and, read-only, the real
 *                  domain.events / analytics.events exchanges (observation)
 *
 * Every helper in rabbitmq/channel.ts and rabbitmq/publisher.ts that
 * declares or writes to broker topology routes through the guards below, so
 * a student experiment can never assert, publish into, or delete a real CRM
 * exchange/queue - on purpose, not by convention alone.
 */

export const STUDENT_NAMESPACE_PREFIX = 'student.rabbitmq-lab.';

/**
 * The real CRM domain exchanges (see services/*\/src/rabbitmq/topology.ts).
 * The lab may bind its own student-namespaced queues here to *observe* real
 * events (Lesson 30 / labs/companies-observer), but must never assert,
 * publish, or delete anything under these names.
 */
export const REAL_DOMAIN_EXCHANGES = Object.freeze([
  'domain.events',
  'analytics.events',
  'commands',
  'domain.events.dlx',
  'commands.dlx',
]);

/** Builds `student.rabbitmq-lab.<segments joined by '.'>`. */
export function studentName(...segments: Array<string | number>): string {
  return `${STUDENT_NAMESPACE_PREFIX}${segments.join('.')}`;
}

export function isStudentName(name: string): boolean {
  return name.startsWith(STUDENT_NAMESPACE_PREFIX);
}

export function isRealDomainExchange(name: string): boolean {
  return (REAL_DOMAIN_EXCHANGES as readonly string[]).includes(name);
}

/**
 * Guard used by every declare/publish helper. Throws instead of silently
 * touching real CRM topology.
 */
export function assertStudentName(name: string, kind: 'exchange' | 'queue'): void {
  if (!isStudentName(name)) {
    throw new Error(
      `Refusing to declare/publish to non-student ${kind} "${name}". ` +
        `The RabbitMQ lab may only write to names starting with "${STUDENT_NAMESPACE_PREFIX}".`,
    );
  }
}

/**
 * Guard used only for *binding* a lab queue to a source exchange. Allows the
 * student namespace plus the known real domain exchanges (read-only
 * observation); rejects everything else, including typos of real exchange
 * names, so a mistake fails loudly instead of silently binding nothing.
 */
export function assertObservableExchange(name: string): void {
  if (isStudentName(name) || isRealDomainExchange(name)) return;
  throw new Error(
    `Refusing to bind to unknown exchange "${name}". Expected a ${STUDENT_NAMESPACE_PREFIX}* ` +
      `exchange or one of the real domain exchanges: ${REAL_DOMAIN_EXCHANGES.join(', ')}.`,
  );
}
