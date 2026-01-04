// packages/server/src/lib/query.ts
/**
 * Small helper to validate and parse query string parameters (Zod).
 *
 * Returns the same shape as parseAndValidate (used for body parsing):
 *  - { ok: true, data } on success
 *  - { ok: false, response } on failure (response is APIGatewayProxyResult)
 *
 * This centralises the repetitive schema.safeParse(...) + error normalisation logic
 * so all handlers can re-use consistent validation error shapes.
 */

import type { APIGatewayProxyEvent, APIGatewayProxyResult } from "aws-lambda";
import type { ZodType } from "zod";
import { jsonResponse } from "./response";

export function parseQuery<T = any>(
  schema: ZodType<T>,
  event: APIGatewayProxyEvent
): { ok: true; data: T } | { ok: false; response: APIGatewayProxyResult } {
  const qs = (event.queryStringParameters || {}) as Record<
    string,
    string | undefined
  >;

  const result = schema.safeParse(qs);
  if (result.success) return { ok: true, data: result.data };

  // Normalise Zod issues -> details array
  const issues = (result.error as any)?.issues ?? [];
  const details = Array.isArray(issues)
    ? issues.map((e: any) => ({
        path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
        message: e.message ?? "invalid",
      }))
    : [];

  return {
    ok: false,
    response: jsonResponse(400, {
      error: "validation_error",
      details,
    }),
  };
}
