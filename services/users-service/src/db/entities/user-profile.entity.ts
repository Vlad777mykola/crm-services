import { EntitySchema } from 'typeorm';

export interface UserProfileEntityRow {
  userId: string;
  name: string;
  phone: string | null;
  city: string | null;
  bio: string | null;
  createdAt: Date;
  updatedAt: Date;
}

export const UserProfileEntity = new EntitySchema<UserProfileEntityRow>({
  name: 'UserProfile',
  schema: 'users_schema',
  tableName: 'user_profiles',
  columns: {
    userId: { type: 'uuid', primary: true },
    name: { type: String, length: 255 },
    phone: { type: String, length: 30, nullable: true },
    city: { type: String, length: 255, nullable: true },
    bio: { type: 'text', nullable: true },
    createdAt: { type: 'timestamptz', createDate: true },
    updatedAt: { type: 'timestamptz', updateDate: true },
  },
});
