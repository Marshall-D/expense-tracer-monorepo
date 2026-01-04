// packages/server/src/handlers/deleteCategory.ts
/**
 * DELETE /api/categories/{id}
 *
 * Responsibilities:
 *  - Validate the category id and that the authenticated user is the owner
 *  - Delete the category, and cascade-update affected expenses to "Uncategorized"
 *
 * Behaviour preserved; uses centralized jsonResponse and emptyOptionsResponse.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

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
    // Robust: categoryId might be stored as ObjectId or as string — update both cases.
    await expenses.updateMany(
      {
        $or: [{ categoryId: catId }, { categoryId: String(catId) }],
      },
      { $set: { categoryId: null, category: "Uncategorized" } }
    );

    // Use 204 No Content to indicate successful deletion
    return jsonResponse(204, {});
  } catch (err) {
    console.error("deleteCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteCategoryImpl);
