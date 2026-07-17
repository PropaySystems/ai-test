import { database, migrateDatabase } from "./database.js";

/**
 * Runs migrations through the application database factory so the SQLite data
 * directory is created consistently on a clean checkout.
 */
try {
  await migrateDatabase(database);
  console.info("Database migrations complete.");
} catch (error) {
  console.error("Database migration failed.", error);
  process.exitCode = 1;
} finally {
  await database.destroy();
}
