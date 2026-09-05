import { EntitySchema } from 'typeorm';

/**
 * Fed by specialist.created/.updated (specialists-service). Lets
 * appointments-service answer "does this userId own this specialistProfileId"
 * locally, without a cross-schema read or a synchronous call to
 * specialists-service, so a specialist can view their own appointments and
 * manage their own availability without needing a company manager role.
 */
export interface SpecialistOwnerProjectionRow {
  specialistProfileId: string;
  userId: string;
  /** Only carried by `specialist.created`; preserved across `.updated` events that don't repeat it. */
  displayName: string | null;
  updatedAt: Date;
}

export const SpecialistOwnerProjectionEntity = new EntitySchema<SpecialistOwnerProjectionRow>({
  name: 'SpecialistOwnerProjection',
  schema: 'appointments_schema',
  tableName: 'specialist_owner_projection',
  columns: {
    specialistProfileId: { type: 'uuid', primary: true },
    userId: { type: 'uuid' },
    displayName: { type: String, length: 200, nullable: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
  indices: [{ name: 'IDX_specialist_owner_projection_userId', columns: ['userId'] }],
});
