import config from "./config/env.js";
import logger from "./utils/logger.js";
import app from "./app.js";
import { startWorkers } from "./modules/worker/index.js";
import { startScheduler } from "./modules/scheduler/index.js";

async function bootstrap() {
  await startWorkers();
  startScheduler();

  app.listen(config.PORT, () => {
    logger.info(`[Server]: Running at http://localhost:${config.PORT}`);
  });
}

bootstrap().catch((err) => {
  logger.error(`[Server]: Failed to start: ${err}`);
  process.exit(1);
});
