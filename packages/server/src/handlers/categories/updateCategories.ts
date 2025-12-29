// packages/server/src/handlers/updateCategories.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { parseAndValidate, jsonResponse } from "../../lib/validation";
import { updateCategorySchema } from "../../lib/validators";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";

const updateCategoriesImpl: APIGatewayProxyHandler = async (event) => {
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

  const parsed = parseAndValidate(updateCategorySchema, event);
  if (!parsed.ok) return parsed.response;

  const updates = parsed.data as any;
  if (!updates || Object.keys(updates).length === 0)
    return jsonResponse(400, {
      error: "no_updates",
      message: "Provide at least one field to update.",
    });

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const categories = db.collection("categories");

    // If updating name, normalize and ensure it doesn't collide (case-insensitive) with any other category
    if (typeof updates.name !== "undefined") {
      const newName = String(updates.name).trim();
      // Check for existing category with same name (case-insensitive) that is NOT this category
      const clash = await categories.findOne(
        { name: newName, _id: { $ne: catId } },
        { collation: { locale: "en", strength: 2 } }
      );
      if (clash) {
        return jsonResponse(409, {
          error: "category_exists",
          message: "Category with that name already exists.",
        });
      }
      updates.name = newName;
    }

    // Only allow updating user-owned categories
    const result = await categories.findOneAndUpdate(
      { _id: catId, userId: new ObjectId(userId) },
      { $set: { ...updates, updatedAt: new Date() } },
      { returnDocument: "after" }
    );

    if (!result.value) {
      return jsonResponse(404, {
        error: "not_found",
        message: "Category not found or not owned by user.",
      });
    }

    const doc = result.value;
    return jsonResponse(200, {
      data: {
        id: String(doc._id),
        name: doc.name,
        color: doc.color ?? null,
        userId: doc.userId ? String(doc.userId) : null,
      },
    });
  } catch (err) {
    console.error("updateCategories error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(updateCategoriesImpl);
