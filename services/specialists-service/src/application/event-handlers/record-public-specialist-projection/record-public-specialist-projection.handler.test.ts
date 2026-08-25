import type { EntityManager } from 'typeorm';
import { describe, expect, it, vi } from 'vitest';

import type { PublicSpecialistProjectionRepository } from '../../../db/public-specialist-projection-repository.js';
import { RecordPublicSpecialistProjectionHandler } from './record-public-specialist-projection.handler.js';

function createDeps() {
  const projections = {
    upsertCompany: vi.fn(),
    addCompanySpecialist: vi.fn(),
    removeCompanySpecialist: vi.fn(),
    upsertService: vi.fn(),
    addServiceSpecialist: vi.fn(),
    removeServiceSpecialist: vi.fn(),
    recordReview: vi.fn(),
  } as unknown as PublicSpecialistProjectionRepository;

  return {
    manager: {} as EntityManager,
    projections,
    handler: new RecordPublicSpecialistProjectionHandler(projections),
  };
}

describe('RecordPublicSpecialistProjectionHandler', () => {
  it('records accepted company-specialist relations', async () => {
    const { handler, manager, projections } = createDeps();

    const handled = await handler.handle(manager, 'company-specialist.accepted', {
      companyId: 'company-1',
      specialistProfileId: 'specialist-1',
    });

    expect(handled).toBe(true);
    expect(projections.addCompanySpecialist).toHaveBeenCalledWith(manager, 'company-1', 'specialist-1');
  });

  it('records published service assignment snapshots', async () => {
    const { handler, manager, projections } = createDeps();

    const handled = await handler.handle(manager, 'specialist-service.assigned', {
      serviceId: 'service-1',
      companyId: 'company-1',
      specialistProfileId: 'specialist-1',
    });

    expect(handled).toBe(true);
    expect(projections.addServiceSpecialist).toHaveBeenCalledWith(manager, {
      serviceId: 'service-1',
      companyId: 'company-1',
      specialistProfileId: 'specialist-1',
    });
  });

  it('records specialist review ratings only when the event has a specialist', async () => {
    const { handler, manager, projections } = createDeps();

    await handler.handle(manager, 'review.received', {
      specialistProfileId: 'specialist-1',
      rating: 5,
    });
    await handler.handle(manager, 'review.received', {
      specialistProfileId: null,
      rating: 4,
    });

    expect(projections.recordReview).toHaveBeenCalledTimes(1);
    expect(projections.recordReview).toHaveBeenCalledWith(manager, 'specialist-1', 5);
  });

  it('ignores unknown event types', async () => {
    const { handler, manager } = createDeps();

    await expect(handler.handle(manager, 'unknown.event', {})).resolves.toBe(false);
  });
});
