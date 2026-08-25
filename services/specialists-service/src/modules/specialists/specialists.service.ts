import type { DataSource } from 'typeorm';

import { CreateMySpecialistProfileHandler } from '../../application/commands/create-my-specialist-profile/create-my-specialist-profile.handler.js';
import { UpdateMySpecialistProfileHandler } from '../../application/commands/update-my-specialist-profile/update-my-specialist-profile.handler.js';
import { GetMySpecialistProfileHandler } from '../../application/queries/get-my-specialist-profile/get-my-specialist-profile.handler.js';
import { GetSpecialistProfileByIdHandler } from '../../application/queries/get-specialist-profile-by-id/get-specialist-profile-by-id.handler.js';
import { ListMySpecialistStatusHistoryHandler } from '../../application/queries/list-my-specialist-status-history/list-my-specialist-status-history.handler.js';
import { ListPublicSpecialistsHandler } from '../../application/queries/list-public-specialists/list-public-specialists.handler.js';
import { TypeOrmSpecialistEventOutbox } from '../../application/services/typeorm-specialist-event-outbox.js';
import type { SpecialistProfileRow, StatusHistoryRow } from '../../db/specialist-repository.js';
import { SpecialistRepository } from '../../db/specialist-repository.js';
import type { PaginationMeta } from '../../common/pagination.js';
import type {
  CreateSpecialistProfileRequestInput,
  PublicSpecialistsQueryInput,
  UpdateSpecialistProfileRequestInput,
} from './specialists.schemas.js';

export class SpecialistsService {
  private readonly createMineCommand: CreateMySpecialistProfileHandler;
  private readonly getByIdQuery: GetSpecialistProfileByIdHandler;
  private readonly getMineQuery: GetMySpecialistProfileHandler;
  private readonly listMyStatusHistoryQuery: ListMySpecialistStatusHistoryHandler;
  private readonly listPublicQuery: ListPublicSpecialistsHandler;
  private readonly updateMineCommand: UpdateMySpecialistProfileHandler;

  constructor(dataSource: DataSource) {
    const specialists = new SpecialistRepository(dataSource);
    const outbox = new TypeOrmSpecialistEventOutbox();
    this.createMineCommand = new CreateMySpecialistProfileHandler(dataSource, specialists, specialists, outbox);
    this.getByIdQuery = new GetSpecialistProfileByIdHandler(specialists);
    this.getMineQuery = new GetMySpecialistProfileHandler(specialists);
    this.listMyStatusHistoryQuery = new ListMySpecialistStatusHistoryHandler(specialists);
    this.listPublicQuery = new ListPublicSpecialistsHandler(specialists);
    this.updateMineCommand = new UpdateMySpecialistProfileHandler(dataSource, specialists, specialists, outbox);
  }

  async createMine(userId: string, input: CreateSpecialistProfileRequestInput): Promise<SpecialistProfileRow> {
    return this.createMineCommand.execute({ userId, input });
  }

  async getMine(userId: string): Promise<SpecialistProfileRow> {
    return this.getMineQuery.execute({ userId });
  }

  async updateMine(userId: string, patch: UpdateSpecialistProfileRequestInput): Promise<SpecialistProfileRow> {
    return this.updateMineCommand.execute({ userId, patch });
  }

  async getMyStatusHistory(userId: string): Promise<StatusHistoryRow[]> {
    return this.listMyStatusHistoryQuery.execute({ userId });
  }

  async getPublic(query: PublicSpecialistsQueryInput): Promise<{ items: SpecialistProfileRow[]; meta: PaginationMeta }> {
    return this.listPublicQuery.execute({ input: query });
  }

  async getById(specialistId: string, requesterUserId: string | undefined): Promise<SpecialistProfileRow> {
    return this.getByIdQuery.execute({ specialistId, requesterUserId });
  }
}
