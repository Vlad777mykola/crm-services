export interface StoredEvent {
  id: string;
  eventType: string;
  aggregateType: string;
  aggregateId: string;
  payload: Record<string, unknown>;
  version: string;
  correlationId: string | null;
  causationId: string | null;
  occurredAt: Date;
}

export interface OutboxDelivery {
  id: string;
  eventId: string;
  sink: string;
  logicalDestination: string;
  status: string;
  attempts: number;
}

export interface DeliveryReceipt {
  sink: string;
  deliveryId: string;
  confirmedAt: Date;
}

export interface EventSink {
  deliver(event: StoredEvent, delivery: OutboxDelivery): Promise<DeliveryReceipt>;
}
