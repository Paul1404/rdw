import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import { errorFields, logger } from "../logger.server";
import { createDatabaseReadinessGuard } from "./readiness.server";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production");
}

export const sql = postgres(databaseUrl ?? "postgresql://localhost:5432/rdw", {
  max: 10,
  idle_timeout: 20,
  connect_timeout: 10,
  max_lifetime: 60 * 30,
  onnotice: () => undefined,
});

export const db = drizzle(sql, { schema });

export const ensureDatabaseReady = createDatabaseReadinessGuard(() => sql`select 1`, {
  onRetry: ({ attempt, delayMs, error }) => {
    logger.info("database.wake_retry", {
      attempt,
      delayMs,
      ...errorFields(error),
    });
  },
  onUnavailable: ({ attempts, error }) => {
    logger.warn("database.wake_pending", {
      attempts,
      ...errorFields(error),
    });
  },
});
