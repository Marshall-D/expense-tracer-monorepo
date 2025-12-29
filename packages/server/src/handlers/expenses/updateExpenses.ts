// packages/server/src/handlers/updateExpenses.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { updateExpenseSchema } from "../../lib/validators";

/**
 * PUT /api/expenses/{id}
 */
const updateExpensesImpl: APIGatewayProxyHandler = async (event) => {
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
      message: "Expense id is required in path.",
    });

  let expenseObjectId: ObjectId;
  try {
    expenseObjectId = new ObjectId(id);
  } catch {
    return jsonResponse(400, {
      error: "invalid_id",
      message: "Expense id is not a valid ObjectId.",
    });
  }

  const parsed = parseAndValidate(updateExpenseSchema, event);
  if (!parsed.ok) return parsed.response;
  const updates = parsed.data as any;

  if (!updates || Object.keys(updates).length === 0) {
    return jsonResponse(400, {
      error: "no_updates",
      message: "Provide at least one updatable field.",
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
    const categoriesColl = db.collection("categories");

    // Build set payload
    const setPayload: any = {};
    if (typeof updates.amount !== "undefined")
      setPayload.amount = updates.amount;
    if (typeof updates.currency !== "undefined")
      setPayload.currency = updates.currency;
    if (typeof updates.description !== "undefined")
      setPayload.description = updates.description;
    if (typeof updates.date !== "undefined")
      setPayload.date = updates.date ? new Date(updates.date) : null;

    // Handle categoryId update if provided
    if (typeof updates.categoryId !== "undefined") {
      if (updates.categoryId === null) {
        setPayload.categoryId = null;
        setPayload.category = "Uncategorized";
      } else {
        // validate categoryId
        try {
          const cid = new ObjectId(updates.categoryId);
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
          setPayload.categoryId = cid;
          setPayload.category = cat.name;
        } catch {
          return jsonResponse(400, {
            error: "invalid_category_id",
            message: "categoryId is not a valid ObjectId.",
          });
        }
      }
    } else if (typeof updates.category !== "undefined") {
      // category name update (try to resolve)
      const cat =
        (await categoriesColl.findOne({
          name: updates.category,
          userId: new ObjectId(userId),
        })) ||
        (await categoriesColl.findOne({
          name: updates.category,
          userId: null,
        }));

      if (cat) {
        setPayload.categoryId = cat._id;
        setPayload.category = cat.name;
      } else {
        // not found -> keep string only, clear categoryId
        setPayload.categoryId = null;
        setPayload.category = updates.category;
      }
    }

    setPayload.updatedAt = new Date();

    const result = await expenses.findOneAndUpdate(
      { _id: expenseObjectId, userId: new ObjectId(userId) },
      { $set: setPayload },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Expense not found.",
      });
    }

    const updated = result.value;
    const responseBody = {
      id: String(updated._id),
      userId: updated.userId ? String(updated.userId) : null,
      amount: updated.amount,
      currency: updated.currency,
      description: updated.description,
      category: updated.category,
      categoryId: updated.categoryId ? String(updated.categoryId) : null,
      date: updated.date ? new Date(updated.date).toISOString() : null,
      createdAt: updated.createdAt
        ? new Date(updated.createdAt).toISOString()
        : null,
      updatedAt: updated.updatedAt
        ? new Date(updated.updatedAt).toISOString()
        : null,
    };

    return jsonResponse(200, { data: responseBody });
  } catch (err) {
    console.error("updateExpenses error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(updateExpensesImpl);
