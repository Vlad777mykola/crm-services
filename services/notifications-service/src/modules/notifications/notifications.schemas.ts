import { z } from 'zod';

import type { NotificationIdParams } from './notifications.contracts.js';

export const notificationIdParamsSchema: z.ZodType<NotificationIdParams> = z.object({
  notificationId: z.string().uuid(),
});

export type NotificationIdParamsInput = z.infer<typeof notificationIdParamsSchema>;
