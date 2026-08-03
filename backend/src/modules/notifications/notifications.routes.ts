import { Router } from 'express';

import { requireAuth } from '@/common/middleware/requireAuth.js';
import { validate } from '@/common/middleware/validate.js';

import { notificationIdParamsSchema, type NotificationIdParams } from './notifications.schemas.js';
import {
  countUnreadNotifications,
  listMyNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from './notifications.service.js';

export const notificationsRouter = Router();

// Registered before `/notifications/me/:notificationId/read` would never conflict since
// Express matches static segments (`unread-count`, `read-all`) before this route is even
// declared, but keeping the static routes first avoids any ordering foot-guns.
notificationsRouter.get('/notifications/me/unread-count', requireAuth, async (req, res, next) => {
  try {
    const count = await countUnreadNotifications(req.auth!.userId);
    res.status(200).json({ message: 'Unread notification count', data: { count } });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post('/notifications/me/read-all', requireAuth, async (req, res, next) => {
  try {
    const notifications = await markAllNotificationsRead(req.auth!.userId);
    res.status(200).json({ message: 'All notifications marked as read', data: notifications });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.get('/notifications/me', requireAuth, async (req, res, next) => {
  try {
    const notifications = await listMyNotifications(req.auth!.userId);
    res.status(200).json({ message: 'Your notifications', data: notifications });
  } catch (err) {
    next(err);
  }
});

notificationsRouter.post(
  '/notifications/me/:notificationId/read',
  requireAuth,
  validate(notificationIdParamsSchema, 'params'),
  async (req, res, next) => {
    try {
      const { notificationId } = req.params as unknown as NotificationIdParams;
      const notification = await markNotificationRead(req.auth!.userId, notificationId);
      res.status(200).json({ message: 'Notification marked as read', data: notification });
    } catch (err) {
      next(err);
    }
  },
);
