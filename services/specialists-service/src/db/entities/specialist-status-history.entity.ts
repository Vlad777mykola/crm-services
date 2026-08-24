import { EntitySchema } from 'typeorm';

export interface StatusHistoryRow {
  id: string;
  specialistProfileId: string;
  fromStatus: string | null;
  toStatus: string;
  changedByUserId: string | null;
  reason: string | null;
  createdAt: Date;
}

export const SpecialistStatusHistoryEntity = new EntitySchema<StatusHistoryRow>({
  name: 'SpecialistStatusHistory',
  schema: 'specialists_schema',
  tableName: 'specialist_status_history',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    specialistProfileId: {
      type: 'uuid',
    },
    fromStatus: {
      type: String,
      length: 50,
      nullable: true,
    },
    toStatus: {
      type: String,
      length: 50,
    },
    changedByUserId: {
      type: 'uuid',
      nullable: true,
    },
    reason: {
      type: 'text',
      nullable: true,
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
    },
  },
  indices: [
    {
      name: 'IDX_specialist_status_history_profileId',
      columns: ['specialistProfileId'],
    },
  ],
});
