import { EntitySchema } from 'typeorm';

export interface ClientProfileProjectionRow {
  userId: string;
  email: string | null;
  name: string | null;
  phone: string | null;
  updatedAt: Date;
}

export const ClientProfileProjectionEntity = new EntitySchema<ClientProfileProjectionRow>({
  name: 'ClientProfileProjection',
  schema: 'appointments_schema',
  tableName: 'client_profiles_projection',
  columns: {
    userId: { type: 'uuid', primary: true },
    email: { type: String, nullable: true },
    name: { type: String, nullable: true },
    phone: { type: String, nullable: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
