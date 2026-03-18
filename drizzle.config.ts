import { defineConfig } from "drizzle-kit";
import dotenv from "dotenv";

dotenv.config();

// drizzle-kit uses its own pg client which rejects Supabase's self-signed cert.
// Setting this env var disables TLS verification for the push/introspect commands only.
process.env["NODE_TLS_REJECT_UNAUTHORIZED"] = "0";

export default defineConfig({
  dialect: "postgresql",
  schema: "./src/db/schema/schema.ts",
  out: "./src/db/migrations",
  dbCredentials: {
    // Use direct connection (not pooler) for migrations — PgBouncer Transaction
    // mode doesn't support SCRAM auth properly. Set DIRECT_DATABASE_URL to the
    // Supabase direct connection string (Settings → Database → Direct connection).
    url: (process.env["DIRECT_DATABASE_URL"] ?? process.env["DATABASE_URL"]) as string,
  },
});
