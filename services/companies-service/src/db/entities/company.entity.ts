import { EntitySchema } from 'typeorm';

export type CompanyStatus = 'draft' | 'published' | 'suspended';

export interface CompanyRow {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  category: string | null;
  website: string | null;
  phone: string | null;
  email: string | null;
  status: CompanyStatus;
  isRemoteSupported: boolean;
  city: string | null;
  address: string | null;
  createdByUserId: string;
  createdAt: Date;
  updatedAt: Date;
}

export const CompanyEntity = new EntitySchema<CompanyRow>({
  name: 'Company',
  schema: 'companies_schema',
  tableName: 'companies',
  columns: {
    id: {
      type: 'uuid',
      primary: true,
      generated: 'uuid',
    },
    name: {
      type: String,
      length: 255,
    },
    slug: {
      type: String,
      length: 255,
      unique: true,
    },
    description: {
      type: 'text',
      nullable: true,
    },
    category: {
      type: String,
      length: 100,
      nullable: true,
    },
    website: {
      type: String,
      length: 255,
      nullable: true,
    },
    phone: {
      type: String,
      length: 30,
      nullable: true,
    },
    email: {
      type: String,
      length: 255,
      nullable: true,
    },
    status: {
      type: String,
      length: 20,
      default: 'draft',
    },
    isRemoteSupported: {
      type: Boolean,
      default: false,
    },
    city: {
      type: String,
      length: 255,
      nullable: true,
    },
    address: {
      type: String,
      length: 255,
      nullable: true,
    },
    createdByUserId: {
      type: 'uuid',
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
  indices: [
    {
      name: 'IDX_companies_createdByUserId',
      columns: ['createdByUserId'],
    },
  ],
});
