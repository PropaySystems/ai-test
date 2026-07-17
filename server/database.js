import fs from "node:fs";
import path from "node:path";
import knex from "knex";
import configuration from "../knexfile.js";

/**
 * Creates the local data directory before SQLite opens its file. Tests can pass
 * their own Knex instance and avoid touching local application data.
 */
export function createDatabase(
  environment = process.env.NODE_ENV ?? "development",
) {
  const selected = configuration[environment] ?? configuration.development;
  const filename = selected.connection?.filename;

  if (filename && filename !== ":memory:") {
    fs.mkdirSync(path.dirname(filename), { recursive: true });
  }

  return knex(selected);
}

export const database = createDatabase();

/** Applies pending migrations before the API accepts requests. */
export async function migrateDatabase(db = database) {
  await db.migrate.latest({
    directory: path.resolve(process.cwd(), "migrations"),
  });
}
