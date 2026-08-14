/**
 * Readiness is "process alive" (health/live) vs "connected to RabbitMQ and
 * able to consume/publish" (health/ready) - see Lesson 24
 * (docs/students/rabitmq/lab-service/20-connections-recovery.md).
 */
let rabbitMqReady = false;
let databaseReady = false;

export function setRabbitMqReady(value: boolean): void {
  rabbitMqReady = value;
}

export function isRabbitMqReady(): boolean {
  return rabbitMqReady;
}

export function setDatabaseReady(value: boolean): void {
  databaseReady = value;
}

export function isDatabaseReady(): boolean {
  return databaseReady;
}

export function isServiceReady(): boolean {
  return rabbitMqReady && databaseReady;
}
