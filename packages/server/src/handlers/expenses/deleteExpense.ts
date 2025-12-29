// packages/server/src/handlers/deleteExpense.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * DELETE /api/expenses/{id}
 * Protected — only the owner may delete.
 */
const deleteExpenseImpl: APIGatewayProxyHandler = async (event) => {
  // Allow preflight early (requireAuth wrapper handles OPTIONS, but safety)
  if (event.httpMethod === "OPTIONS") {
    return {
      statusCode: 204,
      headers: (jsonResponse(204, {}) as any).headers,
      body: "",
    };
  }

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const pathParams = (event.pathParameters || {}) as Record<
    string,
    string | undefined
  >;
  const id = pathParams.id || pathParams.ID || pathParams._id;
  if (!id) {
    return jsonResponse(400, {
      error: "missing_id",
      message: "Expense id is required in path.",
    });
  }

  // validate ObjectId
  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Expense id is not a valid ObjectId.",
    });
  }

  const db = await getDb();
  if (!db) {
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });
  }

  try {
    const expenses = db.collection("expenses");

    const result = await expenses.deleteOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    if (result.deletedCount === 0) {
      // not found or not owned by user
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    // Successful deletion
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("deleteExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteExpenseImpl);
