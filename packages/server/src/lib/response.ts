// packages/server/src/lib/response.ts
/**
 * Small HTTP/JSON response helpers and CORS headers.
 * Single responsibility: centralise response formatting and CORS so other files
 * don't duplicate them.
 */

import type { APIGatewayProxyResult } from "aws-lambda";

export const corsHeaders = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

/**
 * Build a standard APIGateway JSON response with CORS headers.
 * Keep this pure and side-effect free.
 */
export function jsonResponse(
  statusCode: number,
  body: unknown
): APIGatewayProxyResult {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

/**
 * Pre-built response for OPTIONS preflight (no body).
 */
export function emptyOptionsResponse(): APIGatewayProxyResult {
  return {
    statusCode: 204,
    headers: corsHeaders,
    body: "",
  };
}
