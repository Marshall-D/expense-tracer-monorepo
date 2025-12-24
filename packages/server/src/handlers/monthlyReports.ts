// packages/server/src/handlers/monthlyReports.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../lib/requireAuth";
import { jsonResponse } from "../lib/validation";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  year: z
    .string()
    .regex(/^\d{4}$/)
    .transform(Number),
  month: z
    .string()
    .regex(/^\d{1,2}$/)
    .transform(Number),
});

const reportsMonthlyImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const qs = (event.queryStringParameters || {}) as Record<
    string,
    string | undefined
  >;
  const parsed = querySchema.safeParse(qs);
  if (!parsed.success) {
    const details = parsed.error.issues.map((e) => ({
      path: Array.isArray(e.path) ? e.path.join(".") : "",
      message: e.message,
    }));
    return jsonResponse(400, {
      error: "validation_error",
      message: "Invalid query",
      details,
    });
  }

  const { year, month } = parsed.data;

  // canonical UTC month boundaries
  const start = new Date(Date.UTC(year, month - 1, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(year, month, 1, 0, 0, 0, 0)); // exclusive

  const db = await getDb();
  if (!db) return jsonResponse(503, { error: "database_unavailable" });

  try {
    const expenses = db.collection("expenses");

    // totals by currency (only USD and NGN supported)
    const totalsByCurrency = await expenses
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: start, $lt: end },
            currency: { $in: ["USD", "NGN"] },
          },
        },
        {
          $group: {
            _id: "$currency",
            total: { $sum: "$amount" },
            count: { $sum: 1 },
            avg: { $avg: "$amount" },
          },
        },
        { $project: { currency: "$_id", total: 1, count: 1, avg: 1, _id: 0 } },
      ])
      .toArray();

    // top categories by total (across currencies)
    const topCategories = await expenses
      .aggregate([
        {
          $match: {
            userId: new ObjectId(userId),
            date: { $gte: start, $lt: end },
          },
        },
        {
          $group: {
            _id: { categoryId: "$categoryId", category: "$category" },
            total: { $sum: "$amount" },
          },
        },
        { $sort: { total: -1 } },
        { $limit: 5 },
        {
          $project: {
            categoryId: "$_id.categoryId",
            category: "$_id.category",
            total: 1,
            _id: 0,
          },
        },
      ])
      .toArray();

    return jsonResponse(200, {
      period: `${year}-${String(month).padStart(2, "0")}`,
      totals: totalsByCurrency,
      topCategories,
    });
  } catch (err) {
    console.error("reports.monthly error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(reportsMonthlyImpl);
