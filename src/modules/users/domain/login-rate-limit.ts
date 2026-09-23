import { createHash } from "node:crypto";

export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_FAILURE_WINDOW_MS = 15 * 60 * 1000;
export const LOGIN_BLOCK_DURATION_MS = 15 * 60 * 1000;

export const LOGIN_RATE_LIMIT_MESSAGE =
  "Demasiados intentos de inicio de sesión. Intentá nuevamente en unos minutos.";

export function createLoginAttemptKeyHash(
  username: string,
  origin: string,
): string {
  return createHash("sha256")
    .update(`${username}\n${origin}`)
    .digest("hex");
}

export function getRetryAfterSeconds(
  blockedUntil: Date,
  now: Date,
): number {
  return Math.max(
    1,
    Math.ceil((blockedUntil.getTime() - now.getTime()) / 1000),
  );
}
