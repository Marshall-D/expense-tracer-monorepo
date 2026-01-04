// packages/server/src/handlers/categoryReports.ts
/**
 * Reports by category for a given date range.
 *
 * Responsibilities:
 *  - Validate from/to query params
 *  - Aggregate totals per category and per supported currency
 *
 * Behaviour preserved from original implementation.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

const querySchema = z.object({
  from: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid from" }),
  to: z
    .string()
    .refine((s) => !Number.isNaN(Date.parse(s)), { message: "invalid to" }),
});

const reportsByCategoryImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const parsed = parseQuery(querySchema, event);
  if (!parsed.ok) return parsed.response;

  const from = new Date(parsed.data.from);
  const to = new Date(parsed.data.to);
  const end = new Date(to);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0)
    end.setUTCDate(end.getUTCDate() + 1);

  const db = await getDb();
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message:
        "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
    });

  try {
    const expenses = db.collection("expenses");

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
