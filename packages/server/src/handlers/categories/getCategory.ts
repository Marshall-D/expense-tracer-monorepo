// packages/server/src/handlers/getCategory.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const getCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const pathParams = (event.pathParameters || {}) as Record<
    string,
    string | undefined
  >;
  const id = pathParams.id || pathParams.ID || pathParams._id;
  if (!id)
    return jsonResponse(400, {
      error: "missing_id",
      message: "Category id is required in path.",
    });

  let catId: ObjectId;
  try {
    catId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Category id is not a valid ObjectId.",
    });
  }

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");
    const doc = await categories.findOne({
      _id: catId,
      $or: [{ userId: null }, { userId: new ObjectId(userId) }],
    });
    if (!doc)
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found.",
      });

    return jsonResponse(200, {
      data: {
        id: String(doc._id),
        name: doc.name,
        color: doc.color ?? null,
        userId: doc.userId ? String(doc.userId) : null,
      },
    });
  } catch (err) {
    console.error("getCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getCategoryImpl);
