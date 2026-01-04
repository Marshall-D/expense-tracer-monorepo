// packages/server/src/handlers/creatExpenses.ts
/**
 * POST /api/expenses
 *
 * Responsibilities:
 *  - Validate request body (createExpenseSchema)
 *  - Resolve category/categoryId (validate category accessibility)
 *  - Insert expense document with normalized fields
 *
 * Behaviour preserved; consistent JSON/CORS responses via jsonResponse + emptyOptionsResponse.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate } from "../../lib/validation";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { createExpenseSchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const createExpenseImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  const parsed = parseAndValidate(createExpenseSchema, event);
  if (!parsed.ok) return parsed.response;

  const { amount, currency, description, category, date, categoryId } =
    parsed.data as {
      amount: number;
      currency?: string;
      description?: string;
      category?: string;
      categoryId?: string;
      date?: string;
    };

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) {
    return jsonResponse(401, { error: "unauthorized" });
  }

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categoriesColl = db.collection("categories");
    const expenses = db.collection("expenses");

    // Resolve categoryId and normalized category name
    let resolvedCategoryId: ObjectId | null = null;
    let resolvedCategoryName: string = category ?? "Uncategorized";

    // 1) If categoryId provided, validate it exists and is accessible
    if (categoryId) {
      try {
        const cid = new ObjectId(categoryId);
        const cat = await categoriesColl.findOne({
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
    } else if (category && category.trim()) {
      // 2) If only category name provided, try to find user-specific then global
      const userCat = await categoriesColl.findOne({
        name: category,
        userId: new ObjectId(userId),
      });
      const globalCat =
        !userCat &&
        (await categoriesColl.findOne({
          name: category,
          userId: null,
        }));

      const cat = userCat || globalCat;
      if (cat) {
        resolvedCategoryId = cat._id;
        resolvedCategoryName = cat.name;
      } else {
        // Not found -> store string only (optional: auto-create category here)
        resolvedCategoryId = null;
        resolvedCategoryName = category;
      }
    }

    const now = new Date();
    const expenseDoc: any = {
      userId: new ObjectId(userId),
      amount,
      currency: currency ?? "USD",
      description: description ?? "",
      category: resolvedCategoryName,
      categoryId: resolvedCategoryId,
      date: date ? new Date(date) : now,
      createdAt: now,
    };

    const res = await expenses.insertOne(expenseDoc);
    return jsonResponse(201, { id: res.insertedId });
  } catch (err) {
    console.error("createExpense error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(createExpenseImpl);
