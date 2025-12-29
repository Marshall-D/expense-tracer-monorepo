// packages/server/src/handlers/deleteCategory.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteCategoryImpl: APIGatewayProxyHandler = async (event) => {
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
    const expenses = db.collection("expenses");

    // Only owner may delete (global categories cannot be deleted by users)
    const result = await categories.deleteOne({
      _id: catId,
      userId: new ObjectId(userId),
    });
    if (result.deletedCount === 0) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found or not owned by user.",
      });
    }

    // Cascade: set affected expenses to Uncategorized and clear categoryId
    await expenses.updateMany(
      { categoryId: catId },
      { $set: { categoryId: null, category: "Uncategorized" } }
    );

    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("deleteCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteCategoryImpl);
