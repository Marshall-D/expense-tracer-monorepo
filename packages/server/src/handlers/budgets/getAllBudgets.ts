// packages/server/src/handlers/getAllBudgets.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { ObjectId } from "mongodb";
import { z } from "zod";

const querySchema = z.object({
  periodStart: z
    .string()
    .optional()
    .refine((s) => !s || !Number.isNaN(Date.parse(s)), {
      message: "invalid periodStart",
    }),
  categoryId: z
    .string()
    .optional()
    .refine((s) => !s || /^[0-9a-fA-F]{24}$/.test(s), {
      message: "invalid categoryId",
    }),
});

const getAllBudgetsImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const rawQs = (event.queryStringParameters || {}) as Record<string, string>;
  const parsed = querySchema.safeParse(rawQs);
  if (!parsed.success) {
    const details = parsed.error.issues.map((e) => ({
      path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
      message: e.message,
    }));
    return jsonResponse(400, {
      error: "validation_error",
      message: "Invalid query",
      details,
    });
  }

  const { periodStart, categoryId } = parsed.data;

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message: "No database configured.",
    });

  try {
    const budgets = db.collection("budgets");

    const filter: any = { userId: new ObjectId(userId) };
    if (periodStart) {
      const p = new Date(periodStart);
      const canonical = new Date(
        Date.UTC(p.getUTCFullYear(), p.getUTCMonth(), 1)
      );
      filter.periodStart = canonical;
    }
    if (categoryId) {
      filter.categoryId = new ObjectId(categoryId);
    }

    const docs = await budgets.find(filter).sort({ periodStart: -1 }).toArray();
    const items = docs.map((d: any) => ({
      id: String(d._id),
      userId: d.userId ? String(d.userId) : null,
      category: d.category,
      categoryId: d.categoryId ? String(d.categoryId) : null,
      periodStart: d.periodStart ? new Date(d.periodStart).toISOString() : null,
      amount: d.amount,
      createdAt: d.createdAt ? new Date(d.createdAt).toISOString() : null,
      updatedAt: d.updatedAt ? new Date(d.updatedAt).toISOString() : null,
    }));

    return jsonResponse(200, { data: items });
  } catch (err) {
    console.error("getAllBudgets error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(getAllBudgetsImpl);
