import { Redis } from "ioredis";
import config from "./env.js";
import logger from "../utils/logger.js";

let redisClient: Redis | null = null;

export function getRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis(config.REDIS_URL, {
      maxRetriesPerRequest: null,
      lazyConnect: false,
    });

    redisClient.on("connect", () => {
      logger.info("[Redis]: Connected");
    });

    redisClient.on("error", (err: Error) => {
      logger.error(`[Redis]: Error: ${err.message}`);
    });

    redisClient.on("close", () => {
      logger.warn("[Redis]: Connection closed");
    });
  }

  return redisClient;
}

/**
 * Returns plain connection options for BullMQ (avoids ioredis version conflicts
 * between our package and BullMQ's peer dependency).
 */
export function createBullMQConnection() {
  const url = new URL(config.REDIS_URL);
  return {
    host: url.hostname,
    port: parseInt(url.port || "6379"),
    ...(url.password ? { password: decodeURIComponent(url.password) } : {}),
    ...(url.protocol === "rediss:" ? { tls: {} } : {}),
    maxRetriesPerRequest: null as null,
    enableReadyCheck: false,
  };
}

export default getRedis;
