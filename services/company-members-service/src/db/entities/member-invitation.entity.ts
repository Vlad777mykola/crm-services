import { EntitySchema } from 'typeorm';

export interface MemberInvitationRow {
  id: string;
  companyId: string;
  email: string;
  status: string;
  createdAt: Date;
}

export const MemberInvitationEntity = new EntitySchema<MemberInvitationRow>({
  name: 'MemberInvitation',
  schema: 'company_members_schema',
  tableName: 'member_invitations',
  columns: {
    id: { type: 'uuid', primary: true, generated: 'uuid' },
    companyId: { type: 'uuid' },
    email: { type: String, length: 255 },
    status: { type: String, length: 20, default: 'pending' },
    createdAt: { type: 'timestamptz', createDate: true },
  },
});
