// packages/server/src/handlers/getAllCategories.ts

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getAllCategoriesImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});

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

    // fetch global (userId: null) and user-specific
    const cursor = categories
      .find({ $or: [{ userId: null }, { userId: new ObjectId(userId) }] })
      .sort({ userId: -1, name: 1 });
    const docs = await cursor.toArray();

    const items = docs.map((d: any) => ({
      id: String(d._id),
      name: d.name,
      color: d.color ?? null,
      userId: d.userId ? String(d.userId) : null,
      type: d.userId ? "Custom" : "Global",
    }));
    return jsonResponse(200, { data: items });
  } catch (err) {
    console.error("getAllCategories error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getAllCategoriesImpl);
