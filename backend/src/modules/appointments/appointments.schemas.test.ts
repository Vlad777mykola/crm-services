import { describe, expect, it } from 'vitest';

import {
  appointmentIdParamsSchema,
  appointmentOnlyIdParamsSchema,
  createAppointmentRequestSchema,
  respondToAppointmentRequestSchema,
} from './appointments.schemas.js';

const SERVICE_ID = '123e4567-e89b-12d3-a456-426614174000';
const SPECIALIST_ID = '123e4567-e89b-12d3-a456-426614174001';
const COMPANY_ID = '123e4567-e89b-12d3-a456-426614174002';
const APPOINTMENT_ID = '123e4567-e89b-12d3-a456-426614174003';

describe('createAppointmentRequestSchema', () => {
  it('accepts a minimal valid payload', () => {
    const result = createAppointmentRequestSchema.safeParse({
      serviceId: SERVICE_ID,
      requestedStartAt: '2026-09-01T10:00:00.000Z',
    });
    expect(result.success).toBe(true);
  });

  it('accepts an optional specialistProfileId and notes', () => {
    const result = createAppointmentRequestSchema.safeParse({
      serviceId: SERVICE_ID,
      specialistProfileId: SPECIALIST_ID,
      requestedStartAt: '2026-09-01T10:00:00.000Z',
      notes: 'Please call before arriving',
    });
    expect(result.success).toBe(true);
  });

  it('rejects a missing serviceId', () => {
    const result = createAppointmentRequestSchema.safeParse({ requestedStartAt: '2026-09-01T10:00:00.000Z' });
    expect(result.success).toBe(false);
  });

  it('rejects a non-uuid serviceId', () => {
    const result = createAppointmentRequestSchema.safeParse({
      serviceId: 'not-a-uuid',
      requestedStartAt: '2026-09-01T10:00:00.000Z',
    });
    expect(result.success).toBe(false);
  });

  it('rejects a malformed requestedStartAt', () => {
    const result = createAppointmentRequestSchema.safeParse({ serviceId: SERVICE_ID, requestedStartAt: 'tomorrow' });
    expect(result.success).toBe(false);
  });
});

describe('respondToAppointmentRequestSchema', () => {
  it('accepts approved', () => {
    expect(respondToAppointmentRequestSchema.safeParse({ status: 'approved' }).success).toBe(true);
  });

  it('accepts rejected', () => {
    expect(respondToAppointmentRequestSchema.safeParse({ status: 'rejected' }).success).toBe(true);
  });

  it('rejects an invalid status', () => {
    expect(respondToAppointmentRequestSchema.safeParse({ status: 'pending' }).success).toBe(false);
  });
});

describe('appointmentIdParamsSchema', () => {
  it('accepts valid uuids', () => {
    const result = appointmentIdParamsSchema.safeParse({ companyId: COMPANY_ID, appointmentId: APPOINTMENT_ID });
    expect(result.success).toBe(true);
  });

  it('rejects a non-uuid appointmentId', () => {
    const result = appointmentIdParamsSchema.safeParse({ companyId: COMPANY_ID, appointmentId: 'not-a-uuid' });
    expect(result.success).toBe(false);
  });
});

describe('appointmentOnlyIdParamsSchema', () => {
  it('accepts a valid uuid', () => {
    expect(appointmentOnlyIdParamsSchema.safeParse({ appointmentId: APPOINTMENT_ID }).success).toBe(true);
  });

  it('rejects a non-uuid', () => {
    expect(appointmentOnlyIdParamsSchema.safeParse({ appointmentId: 'not-a-uuid' }).success).toBe(false);
  });
});
