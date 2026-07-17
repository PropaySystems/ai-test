import path from "node:path";
import { database } from "./database.js";

/** Rolls back the latest local migration batch through the shared connection. */
try {
  await database.migrate.rollback({
    directory: path.resolve(process.cwd(), "migrations"),
  });
  console.info("Latest database migration batch rolled back.");
} catch (error) {
  console.error("Database rollback failed.", error);
  process.exitCode = 1;
} finally {
  await database.destroy();
}
