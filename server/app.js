import crypto from "node:crypto";
import path from "node:path";
import { fileURLToPath } from "node:url";
import express from "express";
import session from "express-session";
import helmet from "helmet";
import { ZodError } from "zod";
import { createAuthRouter } from "./auth-router.js";
import { createEmailService } from "./email-service.js";
import { createGameRouter } from "./game-router.js";
import { KnexSessionStore } from "./session-store.js";

const currentDirectory = path.dirname(fileURLToPath(import.meta.url));

/** Creates or returns the CSRF token bound to the current browser session. */
function csrfTokenFor(request) {
  if (!request.session.csrfToken) {
    request.session.csrfToken = crypto.randomBytes(24).toString("hex");
  }
  return request.session.csrfToken;
}

/** Rejects cross-site state changes and requests without the session CSRF token. */
function protectStateChanges(request, response, next) {
  if (["GET", "HEAD", "OPTIONS"].includes(request.method)) {
    next();
    return;
  }

  const expectedOrigin = process.env.APP_ORIGIN ?? "http://localhost:5178";
  const suppliedOrigin = request.get("origin");
  const suppliedToken = request.get("x-csrf-token");
  if (
    (suppliedOrigin && suppliedOrigin !== expectedOrigin) ||
    !request.session.csrfToken ||
    !suppliedToken ||
    suppliedToken !== request.session.csrfToken
  ) {
    response
      .status(403)
      .json({ error: "Security token is missing or invalid." });
    return;
  }
  next();
}

/**
 * Builds the Express application with injected database and email services so
 * tests can run without starting a network listener.
 */
export function createApp({ database, emailService = createEmailService() }) {
  const app = express();
  const production = process.env.NODE_ENV === "production";
  const sessionSecret =
    process.env.SESSION_SECRET ??
    (production ? null : "local-development-secret-change-before-deployment");

  if (!sessionSecret) {
    throw new Error("SESSION_SECRET is required in production.");
  }

  app.disable("x-powered-by");
  app.set("trust proxy", production ? 1 : false);
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          "script-src": ["'self'"],
          "worker-src": ["'self'", "blob:"],
        },
      },
    }),
  );
  app.use(express.json({ limit: "64kb" }));
  app.use(
    session({
      name: "edge-kings.sid",
      secret: sessionSecret,
      store: new KnexSessionStore(database),
      resave: false,
      saveUninitialized: false,
      rolling: true,
      cookie: {
        httpOnly: true,
        secure: production,
        sameSite: "strict",
        maxAge: 7 * 24 * 60 * 60_000,
      },
    }),
  );

  app.get("/api/v1/health", (_request, response) => {
    response.json({ status: "ok" });
  });
  app.get("/api/v1/csrf", (request, response) => {
    response.json({ csrfToken: csrfTokenFor(request) });
  });
  app.use("/api/v1", protectStateChanges);
  app.use("/api/v1/auth", createAuthRouter({ database, emailService }));
  app.use("/api/v1/games", createGameRouter({ database }));

  // Production serves the Vite build while development uses Vite's own server.
  if (production) {
    const distribution = path.resolve(currentDirectory, "../dist");
    app.use(express.static(distribution));
    app.use((_request, response) => {
      response.sendFile(path.join(distribution, "index.html"));
    });
  }

  app.use((error, _request, response, _next) => {
    void _next;
    if (error instanceof ZodError) {
      response.status(400).json({
        error: "Submitted data is invalid.",
        details: error.issues,
      });
      return;
    }
    console.error(error);
    response.status(500).json({ error: "Unexpected server error." });
  });

  return app;
}
