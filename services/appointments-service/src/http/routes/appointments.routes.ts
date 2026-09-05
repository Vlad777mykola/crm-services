import { Router } from 'express';
import { z } from 'zod';

import type { AppointmentsService } from '../../modules/appointments/appointments.service.js';
import {
  appointmentIdParamsSchema,
  appointmentOnlyIdParamsSchema,
  availableSlotsQuerySchema,
  changeAppointmentServiceRequestSchema,
  companyIdParamsSchema,
  createTimeBlockRequestSchema,
  createAppointmentRequestSchema,
  listAppointmentsQuerySchema,
  reassignAppointmentSpecialistRequestSchema,
  respondToAppointmentRequestSchema,
  rescheduleAppointmentRequestSchema,
  setAvailabilityRulesRequestSchema,
  specialistAvailabilityParamsSchema,
  specialistTimeBlockParamsSchema,
  timeBlockParamsSchema,
  updateAppointmentNotesRequestSchema,
  type AppointmentIdParamsInput,
  type AppointmentOnlyIdParamsInput,
  type AvailableSlotsQueryInput,
  type ChangeAppointmentServiceInput,
  type CompanyIdParamsInput,
  type CreateTimeBlockInput,
  type CreateAppointmentInput,
  type ListAppointmentsQueryInput,
  type ReassignAppointmentSpecialistInput,
  type RespondToAppointmentInput,
  type RescheduleAppointmentInput,
  type SetAvailabilityRulesInput,
  type SpecialistAvailabilityParamsInput,
  type SpecialistTimeBlockParamsInput,
  type TimeBlockParamsInput,
  type UpdateAppointmentNotesInput,
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
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const appointment = await appointmentsService.create(
          companyId,
          req.auth!.userId,
          req.body as CreateAppointmentInput,
          req.context.requestId,
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
    validate(listAppointmentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const appointments = await appointmentsService.listForCompany(
          companyId,
          req.auth!.userId,
          req.query as unknown as ListAppointmentsQueryInput,
        );
        res.status(200).json({ message: 'Company appointments', data: appointments });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/appointments/requests',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const appointments = await appointmentsService.listPendingForCompany(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Pending appointment requests', data: appointments });
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
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.respond(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as RespondToAppointmentInput,
          req.context.requestId,
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
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.complete(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.context.requestId,
        );
        res.status(200).json({ message: 'Appointment marked as completed', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/appointments/:appointmentId/reschedule',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    validate(rescheduleAppointmentRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.reschedule(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as RescheduleAppointmentInput,
          req.context.requestId,
        );
        res.status(200).json({ message: 'Appointment rescheduled', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/appointments/:appointmentId/reassign-specialist',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    validate(reassignAppointmentSpecialistRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.reassignSpecialist(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as ReassignAppointmentSpecialistInput,
          req.context.requestId,
        );
        res.status(200).json({ message: 'Appointment specialist reassigned', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/appointments/:appointmentId/change-service',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    validate(changeAppointmentServiceRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.changeService(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as ChangeAppointmentServiceInput,
          req.context.requestId,
        );
        res.status(200).json({ message: 'Appointment service changed', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.patch(
    '/companies/:companyId/appointments/:appointmentId/notes',
    requireAuth,
    validate(appointmentIdParamsSchema, 'params'),
    validate(updateAppointmentNotesRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, appointmentId } = req.params as unknown as AppointmentIdParamsInput;
        const appointment = await appointmentsService.updateNotes(
          companyId,
          appointmentId,
          req.auth!.userId,
          req.body as UpdateAppointmentNotesInput,
        );
        res.status(200).json({ message: 'Appointment notes updated', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/availability',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const availability = await appointmentsService.getCompanyAvailability(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Company availability', data: availability });
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/companies/:companyId/availability',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(setAvailabilityRulesRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const rules = await appointmentsService.setCompanyAvailability(
          companyId,
          req.auth!.userId,
          req.body as SetAvailabilityRulesInput,
        );
        res.status(200).json({ message: 'Company availability updated', data: rules });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/time-blocks',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(createTimeBlockRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const block = await appointmentsService.addCompanyTimeBlock(
          companyId,
          req.auth!.userId,
          req.body as CreateTimeBlockInput,
        );
        res.status(201).json({ message: 'Company time block added', data: block });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    '/companies/:companyId/time-blocks/:blockId',
    requireAuth,
    validate(timeBlockParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, blockId } = req.params as unknown as TimeBlockParamsInput;
        await appointmentsService.removeCompanyTimeBlock(companyId, req.auth!.userId, blockId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/companies/:companyId/specialists/:specialistProfileId/availability',
    requireAuth,
    validate(specialistAvailabilityParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, specialistProfileId } = req.params as unknown as SpecialistAvailabilityParamsInput;
        const availability = await appointmentsService.getSpecialistAvailability(
          companyId,
          specialistProfileId,
          req.auth!.userId,
        );
        res.status(200).json({ message: 'Specialist availability', data: availability });
      } catch (err) {
        next(err);
      }
    },
  );

  router.put(
    '/companies/:companyId/specialists/:specialistProfileId/availability',
    requireAuth,
    validate(specialistAvailabilityParamsSchema, 'params'),
    validate(setAvailabilityRulesRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, specialistProfileId } = req.params as unknown as SpecialistAvailabilityParamsInput;
        const rules = await appointmentsService.setSpecialistAvailability(
          companyId,
          specialistProfileId,
          req.auth!.userId,
          req.body as SetAvailabilityRulesInput,
        );
        res.status(200).json({ message: 'Specialist availability updated', data: rules });
      } catch (err) {
        next(err);
      }
    },
  );

  router.post(
    '/companies/:companyId/specialists/:specialistProfileId/time-blocks',
    requireAuth,
    validate(specialistAvailabilityParamsSchema, 'params'),
    validate(createTimeBlockRequestSchema, 'body'),
    async (req, res, next) => {
      try {
        const { companyId, specialistProfileId } = req.params as unknown as SpecialistAvailabilityParamsInput;
        const block = await appointmentsService.addSpecialistTimeBlock(
          companyId,
          specialistProfileId,
          req.auth!.userId,
          req.body as CreateTimeBlockInput,
        );
        res.status(201).json({ message: 'Specialist time block added', data: block });
      } catch (err) {
        next(err);
      }
    },
  );

  router.delete(
    '/companies/:companyId/specialists/:specialistProfileId/time-blocks/:blockId',
    requireAuth,
    validate(specialistTimeBlockParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId, specialistProfileId, blockId } = req.params as unknown as SpecialistTimeBlockParamsInput;
        await appointmentsService.removeSpecialistTimeBlock(companyId, specialistProfileId, req.auth!.userId, blockId);
        res.status(204).send();
      } catch (err) {
        next(err);
      }
    },
  );

  // Registered so `/appointments/me` and `/appointments/:appointmentId/cancel`
  // never collide with `/companies/:companyId/appointments/*` above - neither
  // starts with `/companies/`, so ordering here doesn't actually matter, but
  // keeping them grouped mirrors backend/src/modules/appointments/appointments.routes.ts.
  router.get('/appointments/me', requireAuth, validate(listAppointmentsQuerySchema, 'query'), async (req, res, next) => {
    try {
      const appointments = await appointmentsService.listForClient(
        req.auth!.userId,
        req.query as unknown as ListAppointmentsQueryInput,
      );
      res.status(200).json({ message: 'Your appointments', data: appointments });
    } catch (err) {
      next(err);
    }
  });

  router.get(
    '/appointments/available-slots',
    requireAuth,
    validate(availableSlotsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const slots = await appointmentsService.listAvailableSlots(req.query as unknown as AvailableSlotsQueryInput);
        res.status(200).json({ message: 'Available slots', data: slots });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/appointments/company/:companyId',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    validate(listAppointmentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const appointments = await appointmentsService.listForCompany(
          companyId,
          req.auth!.userId,
          req.query as unknown as ListAppointmentsQueryInput,
        );
        res.status(200).json({ message: 'Company appointments', data: appointments });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/appointments/company/:companyId/requests',
    requireAuth,
    validate(companyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { companyId } = req.params as unknown as CompanyIdParamsInput;
        const appointments = await appointmentsService.listPendingForCompany(companyId, req.auth!.userId);
        res.status(200).json({ message: 'Pending appointment requests', data: appointments });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/appointments/specialist/:specialistProfileId',
    requireAuth,
    validate(z.object({ specialistProfileId: z.string().uuid() }), 'params'),
    validate(listAppointmentsQuerySchema, 'query'),
    async (req, res, next) => {
      try {
        const { specialistProfileId } = req.params as unknown as { specialistProfileId: string };
        const appointments = await appointmentsService.listForSpecialist(
          specialistProfileId,
          req.auth!.userId,
          req.query as unknown as ListAppointmentsQueryInput,
        );
        res.status(200).json({ message: 'Specialist appointments', data: appointments });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/appointments/:appointmentId/status-history',
    requireAuth,
    validate(appointmentOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParamsInput;
        const history = await appointmentsService.getStatusHistory(appointmentId, req.auth!.userId);
        res.status(200).json({ message: 'Appointment status history', data: history });
      } catch (err) {
        next(err);
      }
    },
  );

  router.get(
    '/appointments/:appointmentId',
    requireAuth,
    validate(appointmentOnlyIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParamsInput;
        const appointment = await appointmentsService.getById(appointmentId, req.auth!.userId);
        res.status(200).json({ message: 'Appointment found', data: appointment });
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
        const { appointmentId } = req.params as unknown as AppointmentOnlyIdParamsInput;
        const appointment = await appointmentsService.cancel(appointmentId, req.auth!.userId, req.context.requestId);
        res.status(200).json({ message: 'Appointment cancelled', data: appointment });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
