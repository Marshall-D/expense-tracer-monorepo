// packages/server/src/handlers/createCategories.ts
/**
 * POST /api/categories
 *
 * Responsibilities:
 *  - Validate request body (createCategorySchema)
 *  - Prevent duplicates against global categories or this user's categories (case-insensitive)
 *  - Insert a new user-owned (Custom) category and return its metadata
 *
 * Behaviour preserved.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { createCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const createCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return emptyOptionsResponse();
  }

  const parsed = parseAndValidate(createCategorySchema, event);
  if (!parsed.ok) return parsed.response;

  // normalize: trim whitespace but preserve original casing for display
  const rawName = parsed.data.name as string;
  const name = rawName.trim();
  const color = parsed.data.color as string | undefined;

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");

    // Prevent duplicates against global categories or this user's categories (case-insensitive).
    const existing = await categories.findOne(
      {
        name,
        $or: [{ userId: null }, { userId: new ObjectId(userId) }],
      },
      { collation: { locale: "en", strength: 2 } }
    );

    if (existing) {
      return jsonResponse(409, {
        error: "category_exists",
        message: "Category with that name already exists (global or yours).",
      });
    }

    const now = new Date();
    const doc = {
      name,
      color: color ?? null,
      userId: new ObjectId(userId),
      createdAt: now,
      updatedAt: now,
    };
    const res = await categories.insertOne(doc);

    // return created resource meta (client can adapt if it expects just { id })
    return jsonResponse(201, {
      data: {
        id: String(res.insertedId),
        name,
        color: color ?? null,
        userId, // original behaviour returned raw userId string
        type: "Custom",
      },
    });
  } catch (err) {
    console.error("createCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(createCategoryImpl);
