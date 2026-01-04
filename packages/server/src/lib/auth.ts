// packages/server/src/lib/auth.ts
/**
 * Token helpers for handlers/middleware that need to extract/verify tokens.
 * This file focuses on token extraction and verification and returns null on
 * invalid tokens (non-throwing).
 */

import jwt from "jsonwebtoken";

export type JwtPayload = {
  userId: string;
  name?: string;
  iat?: number;
  exp?: number;
};

/**
 * Extracts a Bearer token from an Authorization header value.
 * Returns null if the header is missing or malformed.
 */
export function getTokenFromHeader(
  auth?: string | null | undefined
): string | null {
  if (!auth) return null;
  const parts = auth.split(" ");
  if (parts.length !== 2) return null;
  const [scheme, token] = parts;
  if (scheme !== "Bearer") return null;
  return token;
}

/**
 * Verify JWT and return payload or null for invalid/expired tokens.
 * Does NOT throw on invalid tokens (helps keep handlers simple and non-throwing).
 */
export function verifyToken(token: string): JwtPayload | null {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    console.error("verifyToken: JWT_SECRET not set");
    return null;
  }

  try {
    const decoded = jwt.verify(token, secret) as JwtPayload;
    if (!decoded || !decoded.userId) return null;
    return decoded;
  } catch (err) {
    // Keep failure non-throwing; log for debug.
    console.debug(
      "verifyToken: token verification failed",
      (err as Error).message
    );
    return null;
  }
}
