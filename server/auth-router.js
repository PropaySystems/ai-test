import argon2 from "argon2";
import { Router } from "express";
import { rateLimit } from "express-rate-limit";
import {
  loginSchema,
  registrationSchema,
  resetPasswordSchema,
  resetRequestSchema,
} from "../shared/schemas.js";
import {
  consumeEmailToken,
  createEmailToken,
  createUser,
  findUserByEmail,
  findUserById,
  requestAccountDeletion,
  updatePassword,
  verifyUserEmail,
} from "./repositories.js";

const blockedNames = ["admin", "administrator", "moderator", "support"];

/** Regenerates a session to prevent fixation after identity changes. */
function regenerateSession(request) {
  return new Promise((resolve, reject) => {
    request.session.regenerate((error) => (error ? reject(error) : resolve()));
  });
}

/** Requires a valid account session and returns a consistent 401 response. */
export function requireAuthentication(request, response, next) {
  if (!request.session.userId) {
    response.status(401).json({ error: "Authentication required." });
    return;
  }
  next();
}

/**
 * Creates account and recovery routes with injected services for isolated API
 * tests and future provider changes.
 */
export function createAuthRouter({ database, emailService }) {
  const router = Router();
  const sensitiveLimiter = rateLimit({
    windowMs: 15 * 60_000,
    limit: 10,
    standardHeaders: "draft-8",
    legacyHeaders: false,
  });

  router.post("/register", sensitiveLimiter, async (request, response) => {
    const input = registrationSchema.parse(request.body);
    if (blockedNames.includes(input.displayName.toLowerCase())) {
      response.status(400).json({ error: "That display name is reserved." });
      return;
    }

    const passwordHash = await argon2.hash(input.password, {
      type: argon2.argon2id,
    });

    try {
      const user = await createUser(database, {
        ...input,
        passwordHash,
      });
      const token = await createEmailToken(
        database,
        user.id,
        "verify",
        60 * 24,
      );
      const delivery = await emailService.sendLink({
        recipient: user.email,
        displayName: user.displayName,
        token,
        type: "verify",
      });

      await regenerateSession(request);
      request.session.userId = user.id;
      response.status(201).json({
        user,
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { previewUrl: delivery.previewUrl }),
      });
    } catch (error) {
      if (String(error.message).includes("UNIQUE constraint failed")) {
        response.status(409).json({
          error:
            "An account or display name with those details already exists.",
        });
        return;
      }
      throw error;
    }
  });

  router.post("/login", sensitiveLimiter, async (request, response) => {
    const input = loginSchema.parse(request.body);
    const record = await findUserByEmail(database, input.email);
    const valid =
      record && (await argon2.verify(record.password_hash, input.password));

    if (!valid) {
      response.status(401).json({ error: "Email or password is incorrect." });
      return;
    }
    if (record.deletion_requested_at) {
      response.status(403).json({
        error:
          "This account is pending deletion. Contact support to restore it.",
      });
      return;
    }

    await regenerateSession(request);
    request.session.userId = record.id;
    response.json({ user: await findUserById(database, record.id) });
  });

  router.post("/logout", (request, response, next) => {
    request.session.destroy((error) => {
      if (error) return next(error);
      response.clearCookie("edge-kings.sid");
      response.status(204).end();
    });
  });

  router.get("/me", async (request, response) => {
    if (!request.session.userId) {
      response.json({ user: null });
      return;
    }
    response.json({
      user: await findUserById(database, request.session.userId),
    });
  });

  router.post(
    "/verification",
    requireAuthentication,
    async (request, response) => {
      const user = await findUserById(database, request.session.userId);
      const token = await createEmailToken(
        database,
        user.id,
        "verify",
        60 * 24,
      );
      const delivery = await emailService.sendLink({
        recipient: user.email,
        displayName: user.displayName,
        token,
        type: "verify",
      });
      response.json({
        message: "Verification email prepared.",
        ...(process.env.NODE_ENV === "production"
          ? {}
          : { previewUrl: delivery.previewUrl }),
      });
    },
  );

  router.post("/verify", sensitiveLimiter, async (request, response) => {
    const token = String(request.body?.token ?? "");
    const record = await consumeEmailToken(database, token, "verify");
    if (!record) {
      response
        .status(400)
        .json({ error: "Verification link is invalid or expired." });
      return;
    }
    await verifyUserEmail(database, record.user_id);
    response.json({ message: "Email verified." });
  });

  router.post(
    "/forgot-password",
    sensitiveLimiter,
    async (request, response) => {
      const { email } = resetRequestSchema.parse(request.body);
      const user = await findUserByEmail(database, email);

      // Always return the same response to prevent account enumeration.
      if (user) {
        const token = await createEmailToken(database, user.id, "reset", 30);
        await emailService.sendLink({
          recipient: user.email,
          displayName: user.display_name,
          token,
          type: "reset",
        });
      }
      response.json({
        message: "If the account exists, a reset link has been prepared.",
      });
    },
  );

  router.post(
    "/reset-password",
    sensitiveLimiter,
    async (request, response) => {
      const input = resetPasswordSchema.parse(request.body);
      const record = await consumeEmailToken(database, input.token, "reset");
      if (!record) {
        response
          .status(400)
          .json({ error: "Reset link is invalid or expired." });
        return;
      }

      const passwordHash = await argon2.hash(input.password, {
        type: argon2.argon2id,
      });
      await updatePassword(database, record.user_id, passwordHash);
      response.json({ message: "Password updated." });
    },
  );

  router.delete(
    "/account",
    requireAuthentication,
    async (request, response, next) => {
      await requestAccountDeletion(database, request.session.userId);
      request.session.destroy((error) => {
        if (error) return next(error);
        response.clearCookie("edge-kings.sid");
        response.status(204).end();
      });
    },
  );

  return router;
}
