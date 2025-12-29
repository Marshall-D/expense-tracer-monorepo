// packages/server/src/handlers/deleteBudget.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const deleteBudgetImpl: APIGatewayProxyHandler = async (event) => {
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
      message: "Budget id is required",
    });

  let bid: ObjectId;
  try {
    bid = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Budget id is not a valid ObjectId.",
    });
  }

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");
    const result = await budgets.deleteOne({
      _id: bid,
      userId: new ObjectId(userId),
    });
    if (result.deletedCount === 0)
      return jsonResponse(404, {
        error: "not_found",
        message: "Budget not found.",
      });
    return jsonResponse(200, { success: true });
  } catch (err) {
    console.error("deleteBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(deleteBudgetImpl);
