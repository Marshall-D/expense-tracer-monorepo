// packages/server/src/lib/password.ts
/**
 * Password utilities: hashing and comparison.
 * These small helpers keep bcrypt usage consistent across the project.
 *
 * - hashPassword(password): returns hashed password string
 * - comparePassword(plain, hash): returns boolean
 *
 * Defaults chosen to match original behaviour (saltRounds = 10).
 */

import bcrypt from "bcryptjs";

const SALT_ROUNDS = 10;

/**
 * Hash a plaintext password. Purely functional (no mutation).
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

/**
 * Compare plaintext password with stored hash.
 */
export async function comparePassword(
  plainPassword: string,
  hashed: string
): Promise<boolean> {
  return bcrypt.compare(plainPassword, hashed);
}
