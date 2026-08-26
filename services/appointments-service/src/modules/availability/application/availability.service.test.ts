import { describe, expect, it } from 'vitest';

import { AvailabilityService } from './availability.service.js';

const companyId = '11111111-1111-4111-8111-111111111111';
const serviceId = '22222222-2222-4222-8222-222222222222';
const specialistProfileId = '33333333-3333-4333-8333-333333333333';

function createService(overrides: Partial<Record<string, unknown>> = {}) {
  const availability = {
    listCompanyRules: async () => [
      { weekday: 1, startTime: '09:00', endTime: '10:00', timezone: 'UTC', active: true },
    ],
    listSpecialistRules: async () => [
      { weekday: 1, startTime: '09:00', endTime: '10:00', timezone: 'UTC', active: true },
    ],
    listCompanyBlocks: async () => [],
    listSpecialistBlocks: async () => [],
    listBusyAppointments: async () => [
      {
        startAt: new Date('2026-08-31T09:15:00.000Z'),
        endAt: new Date('2026-08-31T09:30:00.000Z'),
      },
    ],
    ...overrides,
  };
  const projections = {
    findService: async () => ({ serviceId, companyId, name: 'Consultation', status: 'published', durationMinutes: 30 }),
    isServiceSpecialistAssigned: async () => true,
  };

  return new AvailabilityService(availability as never, projections as never);
}

describe('AvailabilityService', () => {
  it('returns slots that fit availability and exclude busy ranges', async () => {
    const service = createService();

    await expect(
      service.listAvailableSlots({
        companyId,
        serviceId,
        specialistProfileId,
        from: new Date('2026-08-31T09:00:00.000Z'),
        to: new Date('2026-08-31T10:00:00.000Z'),
        slotStepMinutes: 15,
      }),
    ).resolves.toEqual([
      {
        startAt: '2026-08-31T09:30:00.000Z',
        endAt: '2026-08-31T10:00:00.000Z',
      },
    ]);
  });

  it('rejects an exact slot outside configured availability', async () => {
    const service = createService({ listBusyAppointments: async () => [] });

    await expect(
      service.assertSlotAvailable({
        companyId,
        serviceId,
        specialistProfileId,
        startAt: new Date('2026-08-31T08:30:00.000Z'),
        endAt: new Date('2026-08-31T09:00:00.000Z'),
      }),
    ).rejects.toThrow('Selected slot is outside configured availability');
  });
});
