import { z } from "zod";

/** Normalizes email input before uniqueness checks and persistence. */
const email = z.string().trim().toLowerCase().email().max(320);

/** Applies consistent password requirements without storing password rules in UI code. */
const password = z
  .string()
  .min(10, "Password must contain at least 10 characters.")
  .max(128)
  .regex(/[a-z]/, "Password must contain a lowercase letter.")
  .regex(/[A-Z]/, "Password must contain an uppercase letter.")
  .regex(/[0-9]/, "Password must contain a number.");

export const registrationSchema = z.object({
  email,
  displayName: z
    .string()
    .trim()
    .min(3)
    .max(24)
    .regex(
      /^[a-zA-Z0-9 _-]+$/,
      "Display name contains unsupported characters.",
    ),
  password,
});

export const loginSchema = z.object({
  email,
  password: z.string().min(1).max(128),
});

export const resetRequestSchema = z.object({ email });

export const resetPasswordSchema = z.object({
  token: z.string().min(32).max(256),
  password,
});

export const gameConfigSchema = z.object({
  difficulty: z.enum(["easy", "medium", "hard"]),
  humanPlayer: z.enum(["blue", "orange"]),
  clockSeconds: z.union([
    z.literal(180),
    z.literal(300),
    z.literal(600),
    z.null(),
  ]),
  firstPlayer: z.enum(["blue", "orange"]).optional(),
});

export const savedGameSchema = z.object({
  state: z.record(z.string(), z.unknown()),
  moves: z.array(z.record(z.string(), z.unknown())).max(500),
});

export const completionSchema = savedGameSchema.extend({
  result: z.enum(["win", "loss", "draw"]),
  resultReason: z.enum([
    "capture",
    "blocked",
    "resignation",
    "timeout",
    "repetition",
    "no-progress",
    "agreed-draw",
  ]),
  durationSeconds: z.number().int().min(0).max(86_400),
});
