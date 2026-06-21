import { runMigrations } from "../src/server/db/migrate.server";

await runMigrations();
console.info("database migrations applied");
