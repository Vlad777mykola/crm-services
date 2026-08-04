import { registerNotificationSubscribers } from '@/modules/notifications/notification.subscriber.js';

import { eventBus } from './event-bus.js';

let subscribersRegistered = false;

/** Registers application event handlers once during process startup. */
export function registerEventSubscribers(): void {
  if (subscribersRegistered) {
    return;
  }

  registerNotificationSubscribers(eventBus);
  subscribersRegistered = true;
}
