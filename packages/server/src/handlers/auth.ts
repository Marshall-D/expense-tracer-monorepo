// packages/server/src/handlers/auth.ts
/**
 * Auth handlers (register, login)
 *
 * This file contains the AWS Lambda handlers for user registration and login.
 * The actual concerns (response formatting, JWT signing, password hashing)
 * are delegated to small helper modules in src/lib to keep this file focused
 * on request flow and business logic only.
 *
 * Behaviour preserved exactly from original implementation.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { getDb } from "../lib/mongo";
import { parseAndValidate } from "../lib/validation";
import { registerSchema, loginSchema } from "../lib/validators";

import { signJwt } from "../lib/jwt";
import { emptyOptionsResponse, jsonResponse } from "../lib/response";
import { comparePassword, hashPassword } from "../lib/password";

// Keep the handler functions small and explicit; each function returns an
// APIGateway result (via helper jsonResponse) or the pre-built OPTIONS result.

export const register: APIGatewayProxyHandler = async (event) => {
  try {
    // Handle CORS preflight quickly
    if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

    // Parse & validate input using Zod schema helper
    const parsed = parseAndValidate(registerSchema, event);
    if (!parsed.ok) return parsed.response;

    const { name, email, password } = parsed.data;

    // Require JWT secret to be present so we can sign right away
    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment.");
      return jsonResponse(500, {
        error: "server_error",
        message:
          "Server not configured. JWT_SECRET is missing. Contact the administrator.",
      });
    }

    // Get DB connection
    const db = await getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      });
    }

    const users = db.collection("users");

    // Check if user exists
    const existing = await users.findOne({ email });
    if (existing) {
      return jsonResponse(409, {
        error: "user_exists",
        message: "A user with that email already exists.",
      });
    }

    // Hash password (delegated to helper)
    const passwordHash = await hashPassword(password);

    // Insert user
    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      createdAt: now,
    });
    const userId = result.insertedId.toString();

    // Sign JWT (delegated to helper)
    const token = signJwt({ userId, name });

    return jsonResponse(201, {
      user: { id: userId, name, email },
      token,
    });
  } catch (err: any) {
    console.error("register handler error:", err);
    // preserve behaviour: handle duplicate key code if it surfaces
    if (err?.code === 11000) {
      return jsonResponse(409, {
        error: "user_exists",
        message: "A user with that email already exists.",
      });
    }
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const login: APIGatewayProxyHandler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

    const parsed = parseAndValidate(loginSchema, event);
    if (!parsed.ok) return parsed.response;

    const { email, password } = parsed.data;

    if (!process.env.JWT_SECRET) {
      console.error("JWT_SECRET is not configured in environment.");
      return jsonResponse(500, {
        error: "server_error",
        message:
          "Server not configured. JWT_SECRET is missing. Contact the administrator.",
      });
    }

    const db = await getDb();
    if (!db) {
      return jsonResponse(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      });
    }

    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user) {
      return jsonResponse(401, {
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    // Support legacy field names but prefer passwordHash
    const passwordHash =
      user.passwordHash ?? user.password ?? user.hashedPassword ?? null;

    if (!passwordHash) {
      console.error("User found without passwordHash", { userId: user._id });
      return jsonResponse(500, {
        error: "server_error",
        message: "User record corrupted or misconfigured.",
      });
    }

    // Compare password using the helper
    const isMatch = await comparePassword(password, passwordHash);
    if (!isMatch) {
      return jsonResponse(401, {
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    const userId = user._id?.toString ? user._id.toString() : String(user._id);

    const token = signJwt({ userId, name: user.name });

    return jsonResponse(200, {
      user: { id: userId, name: user.name, email },
      token,
    });
  } catch (err: any) {
    console.error("login handler error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};
