import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl && process.env.NODE_ENV === "production") {
  throw new Error("DATABASE_URL is required in production");
}

export const sql = postgres(databaseUrl ?? "postgresql://localhost:5432/rdw", {
  max: 10,
  onnotice: () => undefined,
});

export const db = drizzle(sql, { schema });
