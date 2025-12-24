// packages/server/src/handlers/auth.ts
import { APIGatewayProxyHandler } from "aws-lambda";
import bcrypt from "bcryptjs";
import jwt, { SignOptions, Secret } from "jsonwebtoken";
import { getDb } from "../lib/mongo";
import { parseAndValidate, jsonResponse } from "../lib/validation";
import { registerSchema, loginSchema } from "../lib/validators";

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(statusCode: number, body: unknown) {
  return {
    statusCode,
    headers: CORS_HEADERS,
    body: JSON.stringify(body),
  };
}

export const register: APIGatewayProxyHandler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    const parsed = parseAndValidate(registerSchema, event);
    if (!parsed.ok) return parsed.response;

    const { name, email, password } = parsed.data;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured in environment.");
      return json(500, {
        error: "server_error",
        message:
          "Server not configured. JWT_SECRET is missing. Contact the administrator.",
      });
    }

    const db = await getDb();
    if (!db) {
      return json(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      });
    }

    const users = db.collection("users");
    const existing = await users.findOne({ email });
    if (existing) {
      return json(409, {
        error: "user_exists",
        message: "A user with that email already exists.",
      });
    }

    const saltRounds = 10;
    const passwordHash = await bcrypt.hash(password, saltRounds);

    const now = new Date();
    const result = await users.insertOne({
      name,
      email,
      passwordHash,
      createdAt: now,
    });

    const userId = result.insertedId.toString();

    // --- Type-safe jwt.sign usage ---
    const secret: Secret = jwtSecret as Secret;
    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_LIFETIME ??
        "7d") as unknown as SignOptions["expiresIn"],
    };
    const token = jwt.sign({ userId, name }, secret, signOptions);
    // -----------------------------------

    return json(201, {
      user: { id: userId, name, email },
      token,
    });
  } catch (err: any) {
    console.error("register handler error:", err);
    if (err?.code === 11000) {
      return {
        statusCode: 409,
        headers: CORS_HEADERS,
        body: JSON.stringify({
          error: "user_exists",
          message: "A user with that email already exists.",
        }),
      };
    }
    return json(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const login: APIGatewayProxyHandler = async (event) => {
  try {
    if (event.httpMethod === "OPTIONS") {
      return { statusCode: 204, headers: CORS_HEADERS, body: "" };
    }

    const parsed = parseAndValidate(loginSchema, event);
    if (!parsed.ok) return parsed.response;

    const { email, password } = parsed.data;

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      console.error("JWT_SECRET is not configured in environment.");
      return json(500, {
        error: "server_error",
        message:
          "Server not configured. JWT_SECRET is missing. Contact the administrator.",
      });
    }

    const db = await getDb();
    if (!db) {
      return json(503, {
        error: "database_unavailable",
        message:
          "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
      });
    }

    const users = db.collection("users");
    const user = await users.findOne({ email });

    if (!user) {
      return json(401, {
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    const passwordHash =
      user.passwordHash ?? user.password ?? user.hashedPassword ?? null;
    if (!passwordHash) {
      console.error("User found without passwordHash", { userId: user._id });
      return json(500, {
        error: "server_error",
        message: "User record corrupted or misconfigured.",
      });
    }

    const isMatch = await bcrypt.compare(password, passwordHash);
    if (!isMatch) {
      return json(401, {
        error: "invalid_credentials",
        message: "Invalid email or password.",
      });
    }

    const userId = user._id?.toString ? user._id.toString() : String(user._id);

    // --- Type-safe jwt.sign usage ---
    const secret: Secret = jwtSecret as Secret;
    const signOptions: SignOptions = {
      expiresIn: (process.env.JWT_LIFETIME ??
        "7d") as unknown as SignOptions["expiresIn"],
    };
    const token = jwt.sign({ userId, name: user.name }, secret, signOptions);
    // -----------------------------------

    return json(200, {
      user: { id: userId, name: user.name, email },
      token,
    });
  } catch (err: any) {
    console.error("login handler error:", err);
    return json(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};
