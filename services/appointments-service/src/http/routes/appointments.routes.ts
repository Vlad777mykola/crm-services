import { Router } from 'express';

import type { AppointmentsService } from '../../modules/appointments/appointments.service.js';
import {
  appointmentIdParamsSchema,
  appointmentOnlyIdParamsSchema,
  companyIdParamsSchema,
  createAppointmentRequestSchema,
  respondToAppointmentRequestSchema,
  type AppointmentIdParams,
  type AppointmentOnlyIdParams,
  type CompanyIdParams,
  type CreateAppointmentInput,
  type RespondToAppointmentInput,
} from '../../modules/appointments/appointments.schemas.js';
import { requireAuth } from '../require-auth.js';
import { validate } from '../validate.js';

export function createAppointmentsRouter(appointmentsService: AppointmentsService): Router {
  const router = Router();

  router.post(
    '/companies/:companyId/appointments',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(createAppointmentRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const appointment = await appointmentsService.create(
          companyId,
          req.auth!.userId,
          req.body as CreateAppointmentInput,
        );
        res.status(201).json({ message: 'Appointment requested', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/appointments',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParams;
        const appointments = await appointmentsService.listForCompany(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Company appointments', data: appointments });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/companies/:companyId/appointments/:appointmentId',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    validate(respondToAppointmentRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParams;
        const appointment = await appointmentsService.respond(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as RespondToAppointmentInput,
        );
        res.status(200).json({ message: 'Appointment updated', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/appointments/:appointmentId/complete',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParams;
        const appointment = await appointmentsService.complete(companyId, appointmentId, req.auth!.userId);
        res.status(200).json({ message: 'Appointment marked as completed', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  // Registered so `/appointments/me` and `/appointments/:appointmentId/cancel`
  // never collide with `/companies/:companyId/appointments/*` above - neither
  // starts with `/companies/`, so ordering here doesn't actually matter, but
  // keeping them grouped mirrors backend/src/modules/appointments/appointments.routes.ts.
  router.get('/appointments/me', requireAuth, async (req, res, next) => {
    try {
      const appointments = await appointmentsService.listForClient(req.auth!.userId);
      res.status(200).json({ message: 'Your appointments', data: appointments });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/appointments/:appointmentId/status-history',
    requireAuth,
    validate(appointmentOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParams;
        const history = await appointmentsService.getStatusHistory(appointmentId, req.auth!.userId);
        res.status(200).json({ message: 'Appointment status history', data: history });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/appointments/:appointmentId/cancel',
    requireAuth,
    validate(appointmentOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParams;
        const appointment = await appointmentsService.cancel(appointmentId, req.auth!.userId);
        res.status(200).json({ message: 'Appointment cancelled', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
