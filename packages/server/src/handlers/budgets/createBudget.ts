// packages/server/src/handlers/createBudget.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../../lib/validation";
import { createBudgetSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const createBudgetImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") {
    return jsonResponse(204, {});
  }

  const parsed = parseAndValidate(createBudgetSchema, event);
  if (!parsed.ok) return parsed.response;

  const { categoryId, category, periodStart, amount } = parsed.data as any;
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Enforce categoryId presence — budgets must be for a category
  if (
    !categoryId ||
    typeof categoryId !== "string" ||
    categoryId.trim() === ""
  ) {
    return jsonResponse(400, {
      error: "missing_category",
      message: "categoryId is required for budgets.",
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
    const categories = db.collection("categories");

    // Resolve categoryId / name
    let resolvedCategoryId: ObjectId | null = null;
    let resolvedCategoryName: string = category ?? "Uncategorized";

    if (categoryId) {
      try {
        const cid = new ObjectId(categoryId);
        const cat = await categories.findOne({
          _id: cid,
          $or: [{ userId: new ObjectId(userId) }, { userId: null }],
        });
        if (!cat) {
          return jsonResponse(400, {
            error: "invalid_category",
            message: "Category not found or not accessible.",
          });
        }
        resolvedCategoryId = cid;
        resolvedCategoryName = cat.name;
      } catch {
        return jsonResponse(400, {
          error: "invalid_category_id",
          message: "categoryId is not a valid ObjectId.",
        });
      }
    }

    // normalize periodStart to Date (start of day UTC)
    const periodDate = periodStart ? new Date(periodStart) : null;
    if (!periodDate) {
      return jsonResponse(400, {
        error: "invalid_period",
        message: "periodStart is required and must be a valid date.",
      });
    }
    // canonicalize to midnight UTC to avoid timezone issues
    const canonicalPeriodStart = new Date(
      Date.UTC(periodDate.getUTCFullYear(), periodDate.getUTCMonth(), 1)
    );

    // enforce uniqueness: one budget per user+categoryId+periodStart
    const conflict = await budgets.findOne({
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
      periodStart: canonicalPeriodStart,
    });
    if (conflict) {
      return jsonResponse(409, {
        error: "budget_exists",
        message: "Budget for this category and period already exists.",
      });
    }

    const now = new Date();
    const doc = {
      userId: new ObjectId(userId),
      categoryId: resolvedCategoryId,
      category: resolvedCategoryName,
      periodStart: canonicalPeriodStart,
      amount,
      createdAt: now,
    };

    const res = await budgets.insertOne(doc);
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    console.error("createBudget error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(createBudgetImpl);
