// packages/server/src/handlers/trendReports.ts
import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../lib/requireAuth";
import { jsonResponse } from "../lib/validation";
import { getDb } from "../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";

const querySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 6)),
});

const reportsTrendsImpl: APIGatewayProxyHandler = async (event) => {
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
      details,
    });
  }

  const months = Math.max(1, Math.min(24, parsed.data.months)); // cap at 24 months

  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)
  );

  const db = await getDb();
  if (!db) return jsonResponse(503, { error: "database_unavailable" });

  try {
    const expenses = db.collection("expenses");

    const pipeline = [
      { $match: { userId: new ObjectId(userId), date: { $gte: start } } },
      {
        $group: {
          _id: {
            year: { $year: "$date" },
            month: { $month: "$date" },
            currency: "$currency",
          },
          total: { $sum: "$amount" },
        },
      },
      { $sort: { "_id.year": 1, "_id.month": 1 } },
    ];

    const agg = await expenses.aggregate(pipeline).toArray();

    // restructure into ordered months with totals per currency
    const map = new Map<string, any>();
    for (const row of agg) {
      const y = row._id.year;
      const m = String(row._id.month).padStart(2, "0");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, { month: key, totalUSD: 0, totalNGN: 0 });
      if (row._id.currency === "USD") map.get(key).totalUSD += row.total;
      else if (row._id.currency === "NGN") map.get(key).totalNGN += row.total;
    }

    // ensure months with zero are present
    const out: any[] = [];
    for (let i = 0; i < months; i++) {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}`;
      out.push(map.get(key) ?? { month: key, totalUSD: 0, totalNGN: 0 });
    }

    return jsonResponse(200, { months: out });
  } catch (err) {
    console.error("reports.trends error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(reportsTrendsImpl);
