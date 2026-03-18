import { drizzle } from "drizzle-orm/node-postgres";
import pg from "pg";
import * as schema from "./schema/index.js";
import config from "../config/env.js";
import logger from "../utils/logger.js";

const { Pool } = pg;

// Parse URL manually so the Pool's ssl config takes full control.
// Using connectionString with ?sslmode=require conflicts with rejectUnauthorized: false
// be careful bhai, in newer pg versions, causing either cert errors or SCRAM failures.
const dbUrl = new URL(config.DATABASE_URL);

const pool = new Pool({
  host: dbUrl.hostname,
  port: parseInt(dbUrl.port) || 5432,
  user: dbUrl.username,
  password: decodeURIComponent(dbUrl.password),
  database: dbUrl.pathname.slice(1),
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000,
  ssl: { rejectUnauthorized: false },
});

pool.on("error", (err) => {
  logger.error(`[DB]: Unexpected pool error: ${err.message}`);
});

export const db = drizzle(pool, { schema });

export async function connectDB(): Promise<void> {
  try {
    const client = await pool.connect();
    client.release();
    logger.info("[DB]: PostgreSQL connected");
  } catch (err) {
    logger.error(`[DB]: Connection failed: ${err}`);
    process.exit(1);
  }
}

export default db;