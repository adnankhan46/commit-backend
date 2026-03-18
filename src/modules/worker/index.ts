import { createStoryVerifyWorker } from "./storyVerify.worker.js";
import { createProcessFailuresWorker } from "./processFailures.worker.js";
import { createDailyRowsWorker } from "./dailyRows.worker.js";
import { createSendNotificationsWorker } from "./sendNotifications.worker.js";
import logger from "../../utils/logger.js";

export async function startWorkers() {
  createStoryVerifyWorker();
  createProcessFailuresWorker();
  createDailyRowsWorker();
  createSendNotificationsWorker();
  logger.info("[Workers]: All 4 workers started");
}
