import crypto from "node:crypto";

/** Creates a user and returns only non-sensitive account fields. */
export async function createUser(database, account) {
  const [id] = await database("users").insert({
    email: account.email,
    display_name: account.displayName,
    password_hash: account.passwordHash,
  });
  return findUserById(database, id);
}

/** Finds an account by normalized email, including its password hash for login. */
export function findUserByEmail(database, email) {
  return database("users").where({ email }).first();
}

/** Returns a safe account projection suitable for API responses. */
export function findUserById(database, id) {
  return database("users")
    .select(
      "id",
      "email",
      "display_name as displayName",
      "email_verified_at as emailVerifiedAt",
      "deletion_requested_at as deletionRequestedAt",
      "created_at as createdAt",
    )
    .where({ id })
    .first();
}

/** Marks an email as verified after a valid one-time token is consumed. */
export function verifyUserEmail(database, userId) {
  return database("users")
    .where({ id: userId })
    .update({ email_verified_at: database.fn.now() });
}

/** Replaces a password hash after successful reset-token validation. */
export function updatePassword(database, userId, passwordHash) {
  return database("users")
    .where({ id: userId })
    .update({ password_hash: passwordHash });
}

/** Starts the account deletion recovery window without destroying history yet. */
export function requestAccountDeletion(database, userId) {
  return database("users")
    .where({ id: userId })
    .update({ deletion_requested_at: database.fn.now() });
}

/** Creates an opaque email token and stores only its SHA-256 digest. */
export async function createEmailToken(
  database,
  userId,
  type,
  lifetimeMinutes,
) {
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + lifetimeMinutes * 60_000);

  await database("email_tokens").insert({
    user_id: userId,
    type,
    token_hash: tokenHash,
    expires_at: expiresAt.toISOString(),
  });
  return token;
}

/** Atomically consumes an unused, unexpired token and returns its owner. */
export async function consumeEmailToken(database, token, type) {
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const record = await database("email_tokens")
    .where({ token_hash: tokenHash, type })
    .whereNull("used_at")
    .where("expires_at", ">", new Date().toISOString())
    .first();
  if (!record) return null;

  await database("email_tokens")
    .where({ id: record.id })
    .update({ used_at: database.fn.now() });
  return record;
}

/** Creates the player's only active game after existing-active validation. */
export async function createGame(database, game) {
  await database("games").insert({
    id: game.id,
    user_id: game.userId,
    difficulty: game.difficulty,
    human_player: game.humanPlayer,
    clock_seconds: game.clockSeconds,
    state_json: JSON.stringify(game.state),
    moves_json: "[]",
  });
  return findGameById(database, game.id, game.userId);
}

/** Finds the active game owned by a player. */
export async function findActiveGame(database, userId) {
  const row = await database("games")
    .where({ user_id: userId, status: "active" })
    .first();
  return row ? mapGame(row) : null;
}

/** Finds one owned game and maps JSON fields into browser-ready data. */
export async function findGameById(database, id, userId) {
  const row = await database("games").where({ id, user_id: userId }).first();
  return row ? mapGame(row) : null;
}

/** Saves active board state and complete move history. */
export function saveGame(database, id, userId, state, moves) {
  return database("games")
    .where({ id, user_id: userId, status: "active" })
    .update({
      state_json: JSON.stringify(state),
      moves_json: JSON.stringify(moves),
      updated_at: database.fn.now(),
    });
}

/** Completes a game and stores the final result used by profile statistics. */
export function completeStoredGame(database, id, userId, completion) {
  return database("games")
    .where({ id, user_id: userId, status: "active" })
    .update({
      status: "completed",
      state_json: JSON.stringify(completion.state),
      moves_json: JSON.stringify(completion.moves),
      result: completion.result,
      result_reason: completion.resultReason,
      duration_seconds: completion.durationSeconds,
      completed_at: database.fn.now(),
      updated_at: database.fn.now(),
    });
}

/** Returns the latest 20 completed games for replay and result summaries. */
export async function listGameHistory(database, userId) {
  const rows = await database("games")
    .where({ user_id: userId, status: "completed" })
    .orderBy("completed_at", "desc")
    .limit(20);
  return rows.map(mapGame);
}

/** Aggregates registered-player outcomes and difficulty breakdowns. */
export async function getPlayerStatistics(database, userId) {
  const rows = await database("games")
    .select("result", "difficulty")
    .where({ user_id: userId, status: "completed" });

  return rows.reduce(
    (stats, game) => {
      stats.games += 1;
      stats[
        game.result === "win"
          ? "wins"
          : game.result === "loss"
            ? "losses"
            : "draws"
      ] += 1;
      stats.byDifficulty[game.difficulty].games += 1;
      if (game.result === "win") stats.byDifficulty[game.difficulty].wins += 1;
      stats.winRate = Math.round((stats.wins / stats.games) * 100);
      return stats;
    },
    {
      games: 0,
      wins: 0,
      losses: 0,
      draws: 0,
      winRate: 0,
      byDifficulty: {
        easy: { games: 0, wins: 0 },
        medium: { games: 0, wins: 0 },
        hard: { games: 0, wins: 0 },
      },
    },
  );
}

/** Converts database naming and JSON columns into the API game shape. */
function mapGame(row) {
  return {
    id: row.id,
    status: row.status,
    difficulty: row.difficulty,
    humanPlayer: row.human_player,
    clockSeconds: row.clock_seconds,
    state: JSON.parse(row.state_json),
    moves: JSON.parse(row.moves_json),
    result: row.result,
    resultReason: row.result_reason,
    durationSeconds: row.duration_seconds,
    completedAt: row.completed_at,
    updatedAt: row.updated_at,
  };
}
