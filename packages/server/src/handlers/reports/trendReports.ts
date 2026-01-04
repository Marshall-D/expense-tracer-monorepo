// packages/server/src/handlers/trendReports.ts
/**
 * Trends report handler — returns totals per month for the requested recent months.
 *
 * Responsibility:
 *  - Validate query (months)
 *  - Compute start date
 *  - Run aggregation over expenses collection
 *  - Reformat results into ordered array with totals per currency
 *
 * Notes:
 *  - Wrapped with requireAuth so requestContext.authorizer.userId is available.
 *  - Uses shared helpers: parseQuery (for query validation) and jsonResponse (consistent responses).
 *  - Behaviour preserved exactly from original implementation.
 */

import type { APIGatewayProxyHandler } from "aws-lambda";
import { requireAuth } from "../../lib/requireAuth";
import { jsonResponse, emptyOptionsResponse } from "../../lib/response";
import { getDb } from "../../lib/mongo";
import { z } from "zod";
import { ObjectId } from "mongodb";
import { parseQuery } from "../../lib/query";

const querySchema = z.object({
  months: z
    .string()
    .optional()
    .transform((v) => (v ? Number(v) : 6)),
});

const reportsTrendsImpl: APIGatewayProxyHandler = async (event) => {
  // Preflight
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  // Auth guaranteed by wrapper, but still check presence to keep handler resilient.
  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  // Parse and validate querystring
  const parsedQs = parseQuery(querySchema, event);
  if (!parsedQs.ok) return parsedQs.response;
  const monthsRaw = parsedQs.data.months;
  const months = Math.max(1, Math.min(24, monthsRaw)); // cap at 24 months

  // Compute inclusive start (UTC month boundary)
  const now = new Date();
  const start = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - (months - 1), 1)
  );

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

    // Reformat aggregation into a Map keyed by YYYY-MM to accumulate currency totals
    const map = new Map<
      string,
      { month: string; totalUSD: number; totalNGN: number }
    >();
    for (const row of agg) {
      const y = row._id.year;
      const m = String(row._id.month).padStart(2, "0");
      const key = `${y}-${m}`;
      if (!map.has(key)) map.set(key, { month: key, totalUSD: 0, totalNGN: 0 });
      if (row._id.currency === "USD") map.get(key)!.totalUSD += row.total;
      else if (row._id.currency === "NGN") map.get(key)!.totalNGN += row.total;
    }

    // Ensure months with zero totals are present (ordered starting at `start`)
    const out: Array<{ month: string; totalUSD: number; totalNGN: number }> =
      [];
    for (let i = 0; i < months; i++) {
      const d = new Date(
        Date.UTC(start.getUTCFullYear(), start.getUTCMonth() + i, 1)
      );
      const key = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(
        2,
        "0"
      )}`;
      out.push(
        map.get(key) ?? {
          month: key,
          totalUSD: 0,
          totalNGN: 0,
        }
      );
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
