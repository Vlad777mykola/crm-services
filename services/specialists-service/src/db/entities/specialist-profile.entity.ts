import { EntitySchema } from 'typeorm';

export type SpecialistStatus = 'draft' | 'published' | 'suspended';

export interface SpecialistProfileRow {
  id: string;
  userId: string;
  displayName: string;
  headline: string | null;
  bio: string | null;
  category: string | null;
  city: string | null;
  isRemoteSupported: boolean;
  status: SpecialistStatus;
  createdAt: Date;
  updatedAt: Date;
}

export const SpecialistProfileEntity = new EntitySchema<SpecialistProfileRow>({
  name: 'SpecialistProfile',
  schema: 'specialists_schema',
  tableName: 'specialist_profiles',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    userId: {
      type: 'uuid',
      unique: true,
    },
    displayName: {
      type: String,
      length: 255,
    },
    headline: {
      type: String,
      length: 255,
      nullable: true,
    },
    bio: {
      type: 'text',
      nullable: true,
    },
    category: {
      type: String,
      length: 100,
      nullable: true,
    },
    city: {
      type: String,
      length: 255,
      nullable: true,
    },
    isRemoteSupported: {
      type: Boolean,
      default: false,
    },
    status: {
      type: String,
      length: 20,
      default: 'draft',
    },
    createdAt: {
      type: 'timestamptz',
      createDate: true,
    },
    updatedAt: {
      type: 'timestamptz',
      updateDate: true,
    },
  },
});
