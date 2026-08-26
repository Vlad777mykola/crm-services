import { EntitySchema } from 'typeorm';

export interface SpecialistTimeBlockRow {
  id: string;
  companyId: string;
  specialistProfileId: string;
  startsAt: Date;
  endsAt: Date;
  reason: string | null;
  createdByUserId: string | null;
  createdAt: Date;
}

export const SpecialistTimeBlockEntity = new EntitySchema<SpecialistTimeBlockRow>({
  name: 'SpecialistTimeBlock',
  schema: 'appointments_schema',
  tableName: 'specialist_time_blocks',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    specialistProfileId: { type: 'uuid' },
    startsAt: { type: 'timestamptz' },
    endsAt: { type: 'timestamptz' },
    reason: { type: 'text', nullable: true },
    createdByUserId: { type: 'uuid', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
  },
  indices: [
    { name: 'IDX_specialist_time_blocks_specialist_range', columns: ['companyId', 'specialistProfileId', 'startsAt', 'endsAt'] },
  ],
});
