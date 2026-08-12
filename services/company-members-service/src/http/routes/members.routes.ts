import { Router } from 'express';

import { requireAuth } from '../require-auth.js';
import type { MembersService } from '../../modules/members/members.service.js';
import {
  companyIdParamsSchema,
  inviteMemberRequestSchema,
  memberIdParamsSchema,
  updateMemberRequestSchema,
  type CompanyIdParams,
  type InviteMemberRequestInput,
  type MemberIdParams,
  type UpdateMemberRequestInput,
} from '../../modules/members/members.schemas.js';
import { validate } from '../validate.js';

export function createMembersRouter(membersService: MembersService): Router {
  const router = Router();

  router.get(
    '/companies/:companyId/members',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const members = await membersService.list(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Company members', data: members });
      } catch (err) {
        next(err);
      }
    },
  );

  // Registered before `/members/:memberId` so `invite` is never captured as a `:memberId` path param.
  router.post(
    '/companies/:companyId/members/invite',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(inviteMemberRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const { email } = req.body as InviteMemberRequestInput;
        const member = await membersService.invite(companyId, req.auth!.userId, email);
        res.status(201).json({ message: 'Member added', data: member });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/companies/:companyId/members/:memberId',
    requireAuth,
    validate(memberIdParamsSchema, 'params'),
    validate(updateMemberRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, memberId } = req.params as unknown as MemberIdParams;
        const { status } = req.body as UpdateMemberRequestInput;
        const member = await membersService.updateStatus(companyId, req.auth!.userId, memberId, status);
        res.status(200).json({ message: 'Member updated', data: member });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    '/companies/:companyId/members/:memberId',
    requireAuth,
    validate(memberIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, memberId } = req.params as unknown as MemberIdParams;
        const member = await membersService.remove(companyId, req.auth!.userId, memberId);
        res.status(200).json({ message: 'Member removed', data: member });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
