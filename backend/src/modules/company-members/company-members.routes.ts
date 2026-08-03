import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';

import {
  inviteMemberRequestSchema,
  memberIdParamsSchema,
  updateMemberRequestSchema,
  type InviteMemberRequestInput,
  type MemberIdParams,
  type UpdateMemberRequestInput,
} from './company-members.schemas.js';
import { inviteCompanyMember, listCompanyMembers, removeCompanyMember, updateCompanyMember } from './company-members.service.js';

export const companyMembersRouter = Router();

companyMembersRouter.get(
  '/companies/:companyId/members',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const members = await listCompanyMembers(companyId, req.auth!.userId);
      res.status(200).json({ message: 'Company members', data: members });
    } catch (err) {
      next(err);
    }
  },
);

// Registered before `/members/:memberId` so `invite` is never captured as a `:memberId` path param.
companyMembersRouter.post(
  '/companies/:companyId/members/invite',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  validate(inviteMemberRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const { email } = req.body as InviteMemberRequestInput;
      const member = await inviteCompanyMember(companyId, req.auth!.userId, email);
      res.status(201).json({ message: 'Member added', data: member });
    } catch (err) {
      next(err);
    }
  },
);

companyMembersRouter.patch(
  '/companies/:companyId/members/:memberId',
  requireAuth,
  validate(memberIdParamsSchema, 'params'),
  validate(updateMemberRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId, memberId } = req.params as unknown as MemberIdParams;
      const member = await updateCompanyMember(companyId, req.auth!.userId, memberId, req.body as UpdateMemberRequestInput);
      res.status(200).json({ message: 'Member updated', data: member });
    } catch (err) {
      next(err);
    }
  },
);

companyMembersRouter.delete(
  '/companies/:companyId/members/:memberId',
  requireAuth,
  validate(memberIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId, memberId } = req.params as unknown as MemberIdParams;
      const member = await removeCompanyMember(companyId, req.auth!.userId, memberId);
      res.status(200).json({ message: 'Member removed', data: member });
    } catch (err) {
      next(err);
    }
  },
);
