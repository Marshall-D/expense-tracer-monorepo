// packages/server/src/handlers/categoryReports.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse } from "../../lib/validation";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  from: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid from" }),
  to: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid to" }),
});

const reportsByCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return jsonResponse(204, {});
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const qs = (event.queryStringParameters || {}) as Record<
    string,
    string | undefined
  >;
  const parsed = querySchema.safeParse(qs);
  if (!parsed.success) {
    // Use .issues (ZodIssue[]) — typesafe
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

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  // treat `to` as exclusive upper bound by adding one day if time is 00:00
  const end = new Date(to);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0)
    end.setUTCDate(end.getUTCDate() + 1);

  const db = await getDb();
  if (!db) return jsonResponse(503, { error: "database_unavailable" });

  try {
    const expenses = db.collection("expenses");

    // group by category; compute totals per supported currency
    const pipeline = [
      {
        $match: {
          userId: new ObjectId(userId),
          date: { $gte: from, $lt: end },
        },
      },
      {
        $group: {
          _id: { categoryId: "$categoryId", category: "$category" },
          totalUSD: {
            $sum: { $cond: [{ $eq: ["$currency", "USD"] }, "$amount", 0] },
          },
          totalNGN: {
            $sum: { $cond: [{ $eq: ["$currency", "NGN"] }, "$amount", 0] },
          },
          totalAll: { $sum: "$amount" },
        },
      },
      { $sort: { totalAll: -1 } },
      {
        $project: {
          categoryId: "$_id.categoryId",
          category: "$_id.category",
          totalUSD: 1,
          totalNGN: 1,
          _id: 0,
        },
      },
    ];

    const rows = await expenses.aggregate(pipeline).toArray();

    return jsonResponse(200, {
      from: parsed.data.from,
      to: parsed.data.to,
      byCategory: rows,
    });
  } catch (err) {
    console.error("reports.byCategory error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(reportsByCategoryImpl);
