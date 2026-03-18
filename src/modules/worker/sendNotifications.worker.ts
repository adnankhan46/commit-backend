import { Worker } from "bullmq";
import { inArray } from "drizzle-orm";
import { createBullMQConnection } from "../../config/redis.js";
import { QUEUE_NAMES } from "../../config/queue.js";
import db from "../../db/index.js";
import { users } from "../../db/schema/index.js";
import { sendPushNotifications } from "../../services/notification.service.js";
import logger from "../../utils/logger.js";

export function createSendNotificationsWorker() {
  return new Worker(
    QUEUE_NAMES.SEND_NOTIFICATIONS,
    async (job) => {
      const { userIds, title, body, data } = job.data as {
        userIds: string[];
        title: string;
        body: string;
        data?: Record<string, unknown>;
      };

      if (userIds.length === 0) return;

      const userRows = await db
        .select({ expoPushTokens: users.expoPushTokens })
        .from(users)
        .where(inArray(users.id, userIds));

      const tokens = userRows.flatMap((u) => u.expoPushTokens ?? []);
      if (tokens.length === 0) return;

      const pushPayload: Parameters<typeof sendPushNotifications>[1] = { title, body };
      if (data !== undefined) pushPayload.data = data;
      await sendPushNotifications(tokens, pushPayload);
      logger.info(`[Notifications]: Sent "${title}" to ${tokens.length} device(s)`);
    },
    { connection: createBullMQConnection() }
  );
}
