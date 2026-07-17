import path from "node:path";

/**
 * Resolves the SQLite file from the environment while retaining a conventional
 * Knex configuration that can later gain a PostgreSQL production entry.
 */
const databasePath = path.resolve(
  process.cwd(),
  process.env.DATABASE_PATH ?? "./data/edge-kings.sqlite3",
);

export default {
  development: {
    client: "better-sqlite3",
    connection: { filename: databasePath },
    useNullAsDefault: true,
    migrations: { directory: "./migrations" },
  },
  test: {
    client: "better-sqlite3",
    connection: { filename: ":memory:" },
    useNullAsDefault: true,
    migrations: { directory: "./migrations" },
  },
  production: {
    client: "better-sqlite3",
    connection: { filename: databasePath },
    useNullAsDefault: true,
    migrations: { directory: "./migrations" },
  },
};
