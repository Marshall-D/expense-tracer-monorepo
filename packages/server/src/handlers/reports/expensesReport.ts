// packages/server/src/handlers/expenses.export.ts
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
  format: z.string().optional().default("csv"),
});

function toCSVRow(arr: (string | number | null | undefined)[]) {
  return arr
    .map((v) => {
      if (v === null || v === undefined) return "";
      const s = String(v);
      // escape quotes, wrap field containing commas/quotes/newlines in quotes
      const escaped = s.replace(/"/g, '""');
      if (/[",\n\r]/.test(s)) return `"${escaped}"`;
      return escaped;
    })
    .join(",");
}

const MAX_ROWS = 5000; // safe threshold for inline export

const expensesExportImpl: APIGatewayProxyHandler = async (event) => {
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
      path: Array.isArray(e.path) ? e.path.join(".") : String(e.path ?? ""),
      message: e.message,
    }));
    return jsonResponse(400, {
      error: "validation_error",
      details,
    });
  }

  const { from, to, format } = parsed.data;

  if (format !== "csv") {
    return jsonResponse(400, {
      error: "unsupported_format",
      message: "Only CSV supported for now.",
    });
  }

  const start = new Date(from);
  const end = new Date(to);
  if (end.getHours() === 0 && end.getMinutes() === 0 && end.getSeconds() === 0)
    end.setUTCDate(end.getUTCDate() + 1);

  const db = await getDb();
  if (!db) return jsonResponse(503, { error: "database_unavailable" });

  try {
    const expenses = db.collection("expenses");
    const cursor = expenses
      .find({ userId: new ObjectId(userId), date: { $gte: start, $lt: end } })
      .sort({ date: -1 })
      .limit(MAX_ROWS + 1);

    const docs = await cursor.toArray();
    if (docs.length > MAX_ROWS) {
      // For large exports suggest S3 signed URL flow
      return jsonResponse(413, {
        error: "too_large",
        message: `Export too large for inline PDF/CSV; request a signed S3 export (implement later). Rows > ${MAX_ROWS}`,
      });
    }

    // CSV header
    const header = [
      "id",
      "amount",
      "currency",
      "description",
      "category",
      "categoryId",
      "date",
      "createdAt",
    ];
    const rows = [toCSVRow(header)];
    for (const d of docs) {
      rows.push(
        toCSVRow([
          String(d._id),
          d.amount,
          d.currency,
          d.description ?? "",
          d.category ?? "",
          d.categoryId ? String(d.categoryId) : "",
          d.date ? new Date(d.date).toISOString() : "",
          d.createdAt ? new Date(d.createdAt).toISOString() : "",
        ])
      );
    }
    const csv = rows.join("\n");
    // Return CSV directly
    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv",
        "Content-Disposition": `attachment; filename="expenses_${from}_to_${to}.csv"`,
        "Access-Control-Allow-Origin": "*",
      },
      body: csv,
    };
  } catch (err) {
    console.error("expenses.export error:", err);
    return jsonResponse(500, {
      error: "server_error",
      message: "Internal server error",
    });
  }
};

export const handler = requireAuth(expensesExportImpl);
