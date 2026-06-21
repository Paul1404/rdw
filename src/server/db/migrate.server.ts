import { migrate } from "drizzle-orm/postgres-js/migrator";
import { db, sql } from "./client.server";

export async function runMigrations() {
  await migrate(db, { migrationsFolder: "drizzle" });
  await sql.end();
}
