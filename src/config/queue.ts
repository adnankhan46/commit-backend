import { Queue } from "bullmq";
import { createBullMQConnection } from "./redis.js";

export const QUEUE_NAMES = {
  DAILY_ROWS: "daily-rows",
  STORY_VERIFY: "story-verify",
  PROCESS_FAILURES: "process-failures",
  SEND_NOTIFICATIONS: "send-notifications",
} as const;

// Singleton queues
let dailyRowsQueue: Queue | null = null;
let storyVerifyQueue: Queue | null = null;
let processFailuresQueue: Queue | null = null;
let sendNotificationsQueue: Queue | null = null;

export function getDailyRowsQueue(): Queue {
  if (!dailyRowsQueue) {
    dailyRowsQueue = new Queue(QUEUE_NAMES.DAILY_ROWS, {
      connection: createBullMQConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    });
  }
  return dailyRowsQueue;
}

export function getStoryVerifyQueue(): Queue {
  if (!storyVerifyQueue) {
    storyVerifyQueue = new Queue(QUEUE_NAMES.STORY_VERIFY, {
      connection: createBullMQConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 3000 } },
    });
  }
  return storyVerifyQueue;
}

export function getProcessFailuresQueue(): Queue {
  if (!processFailuresQueue) {
    processFailuresQueue = new Queue(QUEUE_NAMES.PROCESS_FAILURES, {
      connection: createBullMQConnection(),
      defaultJobOptions: { attempts: 3, backoff: { type: "exponential", delay: 5000 } },
    });
  }
  return processFailuresQueue;
}

export function getSendNotificationsQueue(): Queue {
  if (!sendNotificationsQueue) {
    sendNotificationsQueue = new Queue(QUEUE_NAMES.SEND_NOTIFICATIONS, {
      connection: createBullMQConnection(),
      defaultJobOptions: { attempts: 2, backoff: { type: "fixed", delay: 2000 } },
    });
  }
  return sendNotificationsQueue;
}
