import { createApp } from "./app.js";
import { database, migrateDatabase } from "./database.js";

const port = Number(process.env.PORT ?? 3000);

/**
 * Migrates storage before listening so routes never run against a partial
 * schema and startup failures remain visible to local developers.
 */
async function startServer() {
  await migrateDatabase(database);
  const app = createApp({ database });
  const server = app.listen(port, () => {
    console.info(`Edge Kings API listening on http://localhost:${port}`);
  });

  // Close active resources cleanly during local restarts and deployments.
  const shutdown = async () => {
    server.close(async () => {
      await database.destroy();
      process.exit(0);
    });
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

startServer().catch((error) => {
  console.error("Failed to start Edge Kings API.", error);
  process.exit(1);
});
