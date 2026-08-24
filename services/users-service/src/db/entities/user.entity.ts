import { EntitySchema } from 'typeorm';

export interface UserRow {
  id: string;
  email: string | null;
  status: string;
  createdAt: Date;
  updatedAt: Date;
}

export const UserEntity = new EntitySchema<UserRow>({
  name: 'User',
  schema: 'users_schema',
  tableName: 'users',
  columns: {
    id: { type: 'uuid', primary: true },
    email: { type: String, length: 255, nullable: true },
    status: { type: String, length: 20, default: 'active' },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
