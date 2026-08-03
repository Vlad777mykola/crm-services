import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';
import { companyIdParamsSchema, type CompanyIdParams } from '@/modules/companies/companies.schemas.js';

import {
  appointmentIdParamsSchema,
  appointmentOnlyIdParamsSchema,
  createAppointmentRequestSchema,
  respondToAppointmentRequestSchema,
  type AppointmentIdParams,
  type AppointmentOnlyIdParams,
  type CreateAppointmentInput,
  type RespondToAppointmentInput,
} from './appointments.schemas.js';
import {
  cancelAppointment,
  createAppointment,
  listCompanyAppointments,
  listMyAppointments,
  respondToAppointment,
} from './appointments.service.js';

export const appointmentsRouter = Router();

appointmentsRouter.post(
  '/companies/:companyId/appointments',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  validate(createAppointmentRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const appointment = await createAppointment(companyId, req.auth!.userId, req.body as CreateAppointmentInput);
      res.status(201).json({ message: 'Appointment requested', data: appointment });
    } catch (err) {
      next(err);
    }
  },
);

appointmentsRouter.get(
  '/companies/:companyId/appointments',
  requireAuth,
  validate(companyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { companyId } = req.params as unknown as CompanyIdParams;
      const appointments = await listCompanyAppointments(companyId, req.auth!.userId);
      res.status(200).json({ message: 'Company appointments', data: appointments });
    } catch (err) {
      next(err);
    }
  },
);

appointmentsRouter.patch(
  '/companies/:companyId/appointments/:appointmentId',
  requireAuth,
  validate(appointmentIdParamsSchema, 'params'),
  validate(respondToAppointmentRequestSchema, 'body'),
  async (req, res, next) => {
    try {
      const { companyId, appointmentId } = req.params as unknown as AppointmentIdParams;
      const appointment = await respondToAppointment(
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

// Registered before `/companies/:companyId` (in companies.routes.ts) can never match: `/appointments/me`
// and `/appointments/:appointmentId/cancel` don't start with `/companies/`.
appointmentsRouter.get('/appointments/me', requireAuth, async (req, res, next) => {
  try {
    const appointments = await listMyAppointments(req.auth!.userId);
    res.status(200).json({ message: 'Your appointments', data: appointments });
  } catch (err) {
    next(err);
  }
});

appointmentsRouter.post(
  '/appointments/:appointmentId/cancel',
  requireAuth,
  validate(appointmentOnlyIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { appointmentId } = req.params as unknown as AppointmentOnlyIdParams;
      const appointment = await cancelAppointment(appointmentId, req.auth!.userId);
      res.status(200).json({ message: 'Appointment cancelled', data: appointment });
    } catch (err) {
      next(err);
    }
  },
);
