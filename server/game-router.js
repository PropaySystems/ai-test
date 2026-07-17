import crypto from "node:crypto";
import { Router } from "express";
import { createInitialState } from "../shared/game-engine.js";
import {
  completionSchema,
  gameConfigSchema,
  savedGameSchema,
} from "../shared/schemas.js";
import { requireAuthentication } from "./auth-router.js";
import {
  completeStoredGame,
  createGame,
  findActiveGame,
  findGameById,
  getPlayerStatistics,
  listGameHistory,
  saveGame,
} from "./repositories.js";

/** Creates authenticated game persistence, history, and statistics endpoints. */
export function createGameRouter({ database }) {
  const router = Router();
  router.use(requireAuthentication);

  router.get("/active", async (request, response) => {
    response.json({
      game: await findActiveGame(database, request.session.userId),
    });
  });

  router.get("/history", async (request, response) => {
    response.json({
      games: await listGameHistory(database, request.session.userId),
    });
  });

  router.get("/statistics", async (request, response) => {
    response.json({
      statistics: await getPlayerStatistics(database, request.session.userId),
    });
  });

  router.get("/:id", async (request, response) => {
    const game = await findGameById(
      database,
      request.params.id,
      request.session.userId,
    );
    if (!game) {
      response.status(404).json({ error: "Game not found." });
      return;
    }
    response.json({ game });
  });

  router.post("/", async (request, response) => {
    const configuration = gameConfigSchema.parse(request.body);
    if (await findActiveGame(database, request.session.userId)) {
      response.status(409).json({
        error: "Finish or resign the active game before starting another.",
      });
      return;
    }

    const firstPlayer =
      configuration.firstPlayer ?? (Math.random() < 0.5 ? "blue" : "orange");
    const game = await createGame(database, {
      id: crypto.randomUUID(),
      userId: request.session.userId,
      ...configuration,
      state: createInitialState({
        firstPlayer,
        humanPlayer: configuration.humanPlayer,
        clockSeconds: configuration.clockSeconds,
      }),
    });
    response.status(201).json({ game });
  });

  router.put("/:id", async (request, response) => {
    const input = savedGameSchema.parse(request.body);
    const updated = await saveGame(
      database,
      request.params.id,
      request.session.userId,
      input.state,
      input.moves,
    );
    if (!updated) {
      response.status(404).json({ error: "Active game not found." });
      return;
    }
    response.json({ message: "Game saved." });
  });

  router.post("/:id/complete", async (request, response) => {
    const input = completionSchema.parse(request.body);
    const updated = await completeStoredGame(
      database,
      request.params.id,
      request.session.userId,
      input,
    );
    if (!updated) {
      response.status(404).json({ error: "Active game not found." });
      return;
    }
    response.json({
      game: await findGameById(
        database,
        request.params.id,
        request.session.userId,
      ),
    });
  });

  return router;
}
