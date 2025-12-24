// packages/server/src/handlers/getExpense.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../lib/requireAuth";
import { jsonResponse } from "../lib/validation";
import { getDb } from "../lib/mongo";
import { ObjectId } from "mongodb";

/**
 * GET /api/expenses/{id}
 * Protected — only the owner may read.
 */
const getExpenseImpl: APIGatewayProxyHandler = async (event) => {
  // allow preflight (requireAuth also handles OPTIONS)
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
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
    const doc = await expenses.findOne({
      _id: expenseObjectId,
      userId: new ObjectId(userId),
    });

    if (!doc) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    // serialize for client
    const payload = {
      id: String(doc._id),
      userId: doc.userId ? String(doc.userId) : null,
      amount: doc.amount,
      currency: doc.currency,
      description: doc.description,
      category: doc.category,
      date: doc.date ? new Date(doc.date).toISOString() : null,
      createdAt: doc.createdAt ? new Date(doc.createdAt).toISOString() : null,
      updatedAt: doc.updatedAt ? new Date(doc.updatedAt).toISOString() : null,
    };

    return jsonResponse(200, { data: payload });
  } catch (err) {
    console.error("getExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getExpenseImpl);
