import dotenv from "dotenv";
import logger from "../utils/logger.js";

dotenv.config();

const config: { [key: string]: string | undefined } = {
  MONGO: process.env.MONGO as string,
  PORT: process.env.PORT as string,
  JWT_SECRET: process.env.JWT_SECRET as string,
//   DODO_TOKEN: process.env.DODO_TOKEN,
//   DODO_WEBHOOK_TOKEN: process.env.DODO_WEBHOOK_TOKEN,
  FRONTEND_ORIGIN: process.env.FRONTEND_ORIGIN as string,
  ENVIRONMENT: process.env.ENVIRONMENT as string,
};

// ENV Validation

const requiredVars = [
  'MONGO',
  'PORT',
  'JWT_SECRET', 
  'FRONTEND_ORIGIN',
  'ENVIRONMENT'
];

const missingVars = requiredVars.filter((key:string) => !config[key]);

if (missingVars.length > 0) {
  const errorMessage = `[ENV-ERROR]: Missing required env: ${missingVars.join(', ')}`;
  logger.error(errorMessage);
  process.exit(1); 
}

logger.info('[ENV]: All env are properly defined');

export default config;