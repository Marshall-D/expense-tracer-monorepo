// packages/client/src/lib/authValidator.ts
/**
 * Small auth validators used across login/register flows.
 *
 * Rules:
 *  - email: simple (non-empty + contains @ + dot) — sufficient for client-side validation
 *  - password: required, min length 8
 *  - name: required, min length 2
 *
 */

export type ValidationResult = { ok: true } | { ok: false; error: string };

export function validateEmail(email?: string): ValidationResult {
  if (!email || typeof email !== "string" || email.trim() === "") {
    return { ok: false, error: "Email is required." };
  }
  // conservative but practical regex for client-side check
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!re.test(email.trim())) {
    return { ok: false, error: "Enter a valid email address." };
  }
  return { ok: true };
}

export function validatePassword(password?: string): ValidationResult {
  if (!password || typeof password !== "string" || password.length === 0) {
    return { ok: false, error: "Password is required." };
  }
  // minimal rule: at least 8 characters
  if (password.length < 8) {
    return {
      ok: false,
      error: "Password must be at least 8 characters long.",
    };
  }
  return { ok: true };
}

export function validateName(name?: string): ValidationResult {
  if (!name || typeof name !== "string" || name.trim() === "") {
    return { ok: false, error: "Full name is required." };
  }
  if (name.trim().length < 2) {
    return { ok: false, error: "Please enter a valid full name." };
  }
  return { ok: true };
}
