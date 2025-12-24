// packages/server/src/lib/requireAuth.ts
import type { APIGatewayProxyHandler, APIGatewayProxyResult } from "aws-lambda";
import { getTokenFromHeader, verifyToken } from "./auth";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

function json(statusCode: number, body: unknown): APIGatewayProxyResult {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

/**
 * HOF that enforces JWT auth on an APIGatewayProxyHandler.
 * On success attaches { userId, name } to event.requestContext.authorizer.
 */
export function requireAuth(
  handler: APIGatewayProxyHandler
): APIGatewayProxyHandler {
  return async (event, context, callback) => {
    // allow preflight early
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    const authHeader =
      (event.headers as Record<string, string | undefined>)?.authorization ??
      (event.headers as any)?.Authorization;
    const token = getTokenFromHeader(authHeader);
    if (!token) {
      return json(401, {
        error: "unauthorized",
        message: "Missing Authorization header.",
      });
    }

    const payload = verifyToken(token);
    if (!payload) {
      return json(401, {
        error: "unauthorized",
        message: "Invalid or expired token.",
      });
    }

    // attach minimal safe authorizer info (common Lambda pattern)
    event.requestContext = {
      ...(event.requestContext || {}),
      authorizer: { userId: payload.userId, name: payload.name },
    } as any;

    // call wrapped handler
    const result = await handler(event, context, callback);
    return (
      result ?? {
        statusCode: 204,
        headers: CORS_HEADERS,
        body: "",
      }
    );
  };
}
