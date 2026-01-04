// packages/server/src/handlers/reports/expensesReport.ts
/**
 * Expenses report export (CSV).
 *
 * Responsibilities:
 *  - Validate 'from', 'to', 'format' query params
 *  - Fetch matching expenses (with MAX_ROWS safety limit)
 *  - Render CSV with UTF-8 BOM and return it with Content-Disposition
 *
 * Notes:
 *  - CSV generation preserved exactly (including blank spacer lines and header).
 *  - Error responses use jsonResponse for consistency.
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
  format: z.string().optional().default("csv"),
});

/**
 * Escapes and builds one CSV field row.
 * Uses ', ' (comma + space) as the separator to increase visual spacing.
 */
function toCSVRow(arr: (string | number | null | undefined)[]) {
  const cells = arr.map((v) => {
    if (v === null || v === undefined) return "";
    const s = String(v);
    const escaped = s.replace(/"/g, '""');
    if (/[",\n\r]/.test(s)) return `"${escaped}"`;
    return escaped;
  });
  return cells.join(", ");
}

const MAX_ROWS = 5000; // safe threshold for inline export

function formatDateOnlyUTC(input: any) {
  if (!input) return "";
  try {
    const d = new Date(input);
    return d.toISOString().slice(0, 10);
  } catch {
    return String(input);
  }
}

function formatAmount(n: any) {
  const num = Number(n ?? 0);
  if (Number.isNaN(num)) return String(n ?? "");
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

const expensesExportImpl: APIGatewayProxyHandler = async (event) => {
  if (event.httpMethod === "OPTIONS") return emptyOptionsResponse();

  const userId = (event.requestContext as any)?.authorizer?.userId;
  if (!userId) return jsonResponse(401, { error: "unauthorized" });

  const parsed = parseQuery(querySchema, event);
  if (!parsed.ok) return parsed.response;

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
  if (!db)
    return jsonResponse(503, {
      error: "database_unavailable",
      message:
        "No database configured. For local dev copy .env.example -> .env and set MONGO_URI; for production set the secret in SSM/Secrets Manager.",
    });

  try {
    const expenses = db.collection("expenses");
    const cursor = expenses
      .find({ userId: new ObjectId(userId), date: { $gte: start, $lt: end } })
      .sort({ date: -1 })
      .limit(MAX_ROWS + 1);

    const docs = await cursor.toArray();
    if (docs.length > MAX_ROWS) {
      return jsonResponse(413, {
        error: "too_large",
        message: `Export too large for inline CSV; request a signed S3 export (implement later). Rows > ${MAX_ROWS}`,
      });
    }

    // CSV header (no Currency column, no Created At)
    const header = ["Date", "Description", "Category", "Amount"];

    const rows: string[] = [];
    rows.push(toCSVRow(header));
    // blank spacer row (visual spacing between header and data)
    rows.push("");

    for (const d of docs) {
      const row = [
        formatDateOnlyUTC(d.date),
        d.description ?? "",
        d.category ?? "",
        formatAmount(d.amount),
      ];
      rows.push(toCSVRow(row));
      // add a blank spacer line between rows for readability
      rows.push("");
    }

    // prefix a UTF-8 BOM so Excel/Sheets read UTF-8 correctly
    const csvContent = "\uFEFF" + rows.join("\n");

    const fileName = `expenses_${from}_to_${to}.csv`;

    return {
      statusCode: 200,
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${fileName}"`,
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Expose-Headers": "Content-Disposition",
      },
      body: csvContent,
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
