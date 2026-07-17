import request from "supertest";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../server/app.js";
import { createDatabase, migrateDatabase } from "../server/database.js";

let database;
let app;

/** Creates an isolated in-memory API and no-op email delivery for each test. */
beforeEach(async () => {
  database = createDatabase("test");
  await migrateDatabase(database);
  app = createApp({
    database,
    emailService: {
      sendLink: async ({ token }) => ({
        messageId: "test",
        previewUrl: `http://test.local/action?token=${token}`,
      }),
    },
  });
});

afterEach(async () => {
  await database.destroy();
});

/** Fetches the CSRF value and preserves its session through a Supertest agent. */
async function csrf(agent) {
  const response = await agent.get("/api/v1/csrf").expect(200);
  return response.body.csrfToken;
}

/** Registers the standard test player and returns their authenticated agent. */
async function registerPlayer() {
  const agent = request.agent(app);
  const token = await csrf(agent);
  const response = await agent
    .post("/api/v1/auth/register")
    .set("x-csrf-token", token)
    .send({
      email: "player@example.com",
      displayName: "EdgePlayer",
      password: "SecurePass123",
    })
    .expect(201);
  return { agent, token: await csrf(agent), user: response.body.user };
}

describe("account API", () => {
  it("registers a normalized account and establishes a session", async () => {
    const { agent, user } = await registerPlayer();
    expect(user).toMatchObject({
      email: "player@example.com",
      displayName: "EdgePlayer",
    });

    const profile = await agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user.id).toBe(user.id);
  });

  it("rejects state changes without a CSRF token", async () => {
    await request(app)
      .post("/api/v1/auth/login")
      .send({ email: "nobody@example.com", password: "anything" })
      .expect(403);
  });

  it("logs out and clears the authenticated session", async () => {
    const { agent, token } = await registerPlayer();
    await agent
      .post("/api/v1/auth/logout")
      .set("x-csrf-token", token)
      .expect(204);
    const profile = await agent.get("/api/v1/auth/me").expect(200);
    expect(profile.body.user).toBeNull();
  });
});

describe("game API", () => {
  it("creates, saves, and completes the player's only active game", async () => {
    const { agent, token } = await registerPlayer();
    const created = await agent
      .post("/api/v1/games")
      .set("x-csrf-token", token)
      .send({
        difficulty: "easy",
        humanPlayer: "blue",
        clockSeconds: null,
      })
      .expect(201);

    await agent
      .post("/api/v1/games")
      .set("x-csrf-token", token)
      .send({
        difficulty: "easy",
        humanPlayer: "blue",
        clockSeconds: null,
      })
      .expect(409);

    const game = created.body.game;
    await agent
      .put(`/api/v1/games/${game.id}`)
      .set("x-csrf-token", token)
      .send({ state: game.state, moves: [] })
      .expect(200);

    await agent
      .post(`/api/v1/games/${game.id}/complete`)
      .set("x-csrf-token", token)
      .send({
        state: { ...game.state, status: "completed", winner: "blue" },
        moves: [],
        result: "win",
        resultReason: "capture",
        durationSeconds: 30,
      })
      .expect(200);

    const statistics = await agent.get("/api/v1/games/statistics").expect(200);
    expect(statistics.body.statistics).toMatchObject({
      games: 1,
      wins: 1,
      winRate: 100,
    });
  });
});
