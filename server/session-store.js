import session from "express-session";

/**
 * Persists Express sessions through Knex so local restarts do not silently log
 * players out and the storage implementation can later move to PostgreSQL.
 */
export class KnexSessionStore extends session.Store {
  constructor(database) {
    super();
    this.database = database;
  }

  /** Reads and deserializes a non-expired session. */
  async get(sid, callback) {
    try {
      const row = await this.database("sessions").where({ sid }).first();
      if (!row || new Date(row.expires_at) <= new Date()) {
        if (row) await this.destroy(sid, () => {});
        callback(null, null);
        return;
      }
      callback(null, JSON.parse(row.data));
    } catch (error) {
      callback(error);
    }
  }

  /** Inserts or updates session data and its cookie-derived expiry. */
  async set(sid, value, callback = () => {}) {
    try {
      const expiresAt =
        value.cookie?.expires ??
        new Date(Date.now() + (value.cookie?.maxAge ?? 86_400_000));
      const record = {
        sid,
        data: JSON.stringify(value),
        expires_at: new Date(expiresAt).toISOString(),
      };

      await this.database("sessions")
        .insert(record)
        .onConflict("sid")
        .merge(record);
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  /** Removes a session during logout, expiry, or account recovery. */
  async destroy(sid, callback = () => {}) {
    try {
      await this.database("sessions").where({ sid }).delete();
      callback(null);
    } catch (error) {
      callback(error);
    }
  }

  /** Refreshes the expiry without changing other session fields. */
  touch(sid, value, callback = () => {}) {
    this.set(sid, value, callback);
  }
}
