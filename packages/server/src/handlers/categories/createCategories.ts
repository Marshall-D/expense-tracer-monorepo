// packages/server/src/handlers/createCategories.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../../lib/validation";
import { createCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const createCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
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

    // Case-insensitive existence check using collation (must match index collation)
    const existing = await categories.findOne(
      { name },
      { collation: { locale: "en", strength: 2 } }
    );

    if (existing) {
      return jsonResponse(409, {
        error: "category_exists",
        message: "Category with that name already exists.",
      });
    }

    const now = new Date();
    const doc = {
      name,
      color: color ?? null,
      userId: new ObjectId(userId),
      createdAt: now,
    };
    const res = await categories.insertOne(doc);
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    console.error("createCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(createCategoryImpl);
