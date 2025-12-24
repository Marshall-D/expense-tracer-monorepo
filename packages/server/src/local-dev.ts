// packages/server/src/local-dev.ts
import "dotenv/config";
import type { APIGatewayProxyResult } from "aws-lambda";
import express, { Request, Response } from "express";
import bodyParser from "body-parser";
import cors from "cors";

// import handlers (ensure these files exist)
import { handler as healthHandler } from "./handlers/health";
import { register as authRegister, login } from "./handlers/auth";
import { handler as createExpenseHandler } from "./handlers/createExpenses"; // <-- new import
import { handler as getAllExpensesHandler } from "./handlers/getAllExpenses";
import { handler as updateExpensesHandler } from "./handlers/updateExpenses";
import { handler as deleteExpenseHandler } from "./handlers/deleteExpense";
import { handler as getExpenseHandler } from "./handlers/getExpense";

const app = express();
app.use(bodyParser.json());
app.use(cors()); // allow CORS for local dev

const CORS_HEADERS = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

// helper: convert express request -> APIGateway event-like object
function toApiGatewayEvent(req: Request) {
  return {
    httpMethod: req.method,
    path: req.path,
    headers: req.headers,
    queryStringParameters: req.query as Record<string, string> | null,
    body:
      req.body && Object.keys(req.body).length ? JSON.stringify(req.body) : "",
    requestContext: {
      identity: { sourceIp: req.ip },
    },
  } as any;
}

// helper: convert APIGatewayProxyResult -> express response
function sendApiResponse(res: Response, result: APIGatewayProxyResult | void) {
  if (!result) {
    return res.status(500).json({ error: "handler_returned_no_response" });
  }
  const statusCode = result.statusCode ?? 200;
  const headers = (result.headers as Record<string, string>) ?? {};
  // Ensure CORS header present
  res.set({ "Access-Control-Allow-Origin": "*", ...headers } as any);
  // if body is JSON string already, try to parse for pretty response
  const body = result.body ?? "";
  // If content-type indicates JSON, send parsed; else send raw
  const contentType =
    headers["Content-Type"] ?? headers["content-type"] ?? "application/json";
  if (contentType.includes("application/json")) {
    try {
      return res.status(statusCode).send(JSON.parse(body as string));
    } catch {
      return res.status(statusCode).send(body);
    }
  }
  return res.status(statusCode).send(body);
}

// Health route (existing)
app.get("/api/health", async (_req, res) => {
  try {
    const result = (await healthHandler(
      {} as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev health handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Auth register route (POST)
app.post("/api/auth/register", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await authRegister(
      event as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev auth.register handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

app.post("/api/auth/login", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await login(
      event as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev auth.login handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// Expenses create route (POST) - uses the same APIGateway handler pattern
app.post("/api/expenses", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await createExpenseHandler(
      event as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.create handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/expenses (list) - uses APIGateway-style handler
app.get("/api/expenses", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    const result = (await getAllExpensesHandler(
      event as any,
      {} as any,
      () => null
    )) as any;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.getAll handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// PUT /api/expenses/:id (update)
app.put("/api/expenses/:id", async (req, res) => {
  try {
    // include body + path params when building APIGateway-like event
    const event = toApiGatewayEvent(req);
    // express path param is in req.params; toApiGatewayEvent currently doesn't attach pathParameters,
    // so add them manually to the event object:
    (event as any).pathParameters = req.params || {};
    const result = (await updateExpensesHandler(
      event as any,
      {} as any,
      () => null
    )) as any;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.update handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// DELETE /api/expenses/:id (delete)
app.delete("/api/expenses/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    // attach pathParameters (toApiGatewayEvent doesn't currently do this)
    (event as any).pathParameters = req.params || {};
    const result = (await deleteExpenseHandler(
      event as any,
      {} as any,
      () => null
    )) as any;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.delete handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// GET /api/expenses/:id (get single expense)
app.get("/api/expenses/:id", async (req, res) => {
  try {
    const event = toApiGatewayEvent(req);
    // attach pathParameters from express params
    (event as any).pathParameters = req.params || {};
    const result = (await getExpenseHandler(
      event as any,
      {} as any,
      () => null
    )) as APIGatewayProxyResult | void;
    return sendApiResponse(res, result);
  } catch (err) {
    console.error("local-dev expenses.get handler error", err);
    return res.status(500).json({ error: "Internal server error" });
  }
});

// generic fallback for OPTIONS preflight for various endpoints
app.use((req, res, next) => {
  if (req.method === "OPTIONS") {
    res
      .set(CORS_HEADERS as any)
      .status(204)
      .send("");
    return;
  }
  next();
});

const port = Number(process.env.PORT || 3000);
app.listen(port, () =>
  console.log("Local server running on http://localhost:" + port)
);
