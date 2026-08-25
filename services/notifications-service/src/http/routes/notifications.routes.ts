import { Router } from 'express';

import { createRequireAuth } from '@crm/auth-kit';

import { env } from '../../env.js';
import type { NotificationsHttpService } from '../../modules/notifications/notifications.service.js';
import {
  notificationIdParamsSchema,
  type NotificationIdParamsInput,
} from '../../modules/notifications/notifications.schemas.js';
import { validate } from '../validate.js';

export function createNotificationsRouter(notificationsService: NotificationsHttpService): Router {
  const router = Router();
  const requireAuth = createRequireAuth({ jwtSecret: env.JWT_ACCESS_SECRET });

  // Static segments (`unread-count`, `read-all`) are declared before the
  // `:notificationId` route so Express's matching order can't accidentally
  // treat them as an id - mirrors backend/src/modules/notifications/notifications.routes.ts.
  router.get('/notifications/me/unread-count', requireAuth, async (req, res, next) => {
    try {
      const count = await notificationsService.countUnread(req.auth!.userId);
      res.status(200).json({ message: 'Unread notification count', data: { count } });
    } catch (err) {
      next(err);
    }
  });

  router.post('/notifications/me/read-all', requireAuth, async (req, res, next) => {
    try {
      const notifications = await notificationsService.markAllRead(req.auth!.userId);
      res.status(200).json({ message: 'All notifications marked as read', data: notifications });
    } catch (err) {
      next(err);
    }
  });

  router.get('/notifications/me', requireAuth, async (req, res, next) => {
    try {
      const notifications = await notificationsService.listForUser(req.auth!.userId);
      res.status(200).json({ message: 'Your notifications', data: notifications });
    } catch (err) {
      next(err);
    }
  });

  router.post(
    '/notifications/me/:notificationId/read',
    requireAuth,
    validate(notificationIdParamsSchema, 'params'),
    async (req, res, next) => {
      try {
        const { notificationId } = req.params as unknown as NotificationIdParamsInput;
        const notification = await notificationsService.markRead(req.auth!.userId, notificationId);
        res.status(200).json({ message: 'Notification marked as read', data: notification });
      } catch (err) {
        next(err);
      }
    },
  );

  return router;
}
