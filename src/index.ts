import dotenv from "dotenv";
import config from "./config/env.js";
import logger from "./utils/logger.js";
import app from "./app.js";

dotenv.config();

const PORT = config.port || process.env.PORT || 3000;

app.listen(PORT, () => {
  logger.info(`[Connection]: Server running at http://localhost:${PORT}`);
});
