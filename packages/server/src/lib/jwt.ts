// packages/server/src/lib/jwt.ts
/**
 * JWT helpers: signJwt creates a signed token using configured secret and
 * configured lifetime.
 *
 * Single responsibility: centralise jwt signing logic (type-safety, default lifetime).
 */

import jwt, { SignOptions, Secret } from "jsonwebtoken";

export type SignPayload = {
  userId: string;
  name?: string;
};

/**
 * Sign a JWT with the configured secret and lifetime.
 * Throws if JWT_SECRET is missing (handlers check it too, but helper is safe).
 */
export function signJwt(payload: SignPayload): string {
  const secretStr = process.env.JWT_SECRET;
  if (!secretStr) {
    throw new Error("JWT_SECRET not configured");
  }
  const secret: Secret = secretStr as Secret;

  const expiresIn = (process.env.JWT_LIFETIME ??
    "7d") as SignOptions["expiresIn"];
  const signOptions: SignOptions = { expiresIn };

  return jwt.sign(payload as any, secret, signOptions);
}
