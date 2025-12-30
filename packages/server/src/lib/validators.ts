// packages/server/src/lib/validators.ts
import { z } from "zod";

/**
 * Register schema
 */
export const registerSchema = z.object({
  name: z.string().min(1, "name is required"),
  email: z.string().email("invalid email"),
  password: z.string().min(6, "password must be at least 6 characters"),
});

/**
 * Login schema
 */
export const loginSchema = z.object({
  email: z.string().email("invalid email"),
  password: z.string().min(1, "password is required"),
});

/**
 * Helper: 24-hex ObjectId string validator
 */
const objectIdString = z.string().refine((s) => /^[0-9a-fA-F]{24}$/.test(s), {
  message: "must be a 24-character hex string",
});

/**
 * Create expense schema
 */
export const createExpenseSchema = z.object({
  amount: z.preprocess((val) => {
    if (typeof val === "string" && val.trim() !== "") {
      const n = Number(val);
      return isNaN(n) ? val : n;
    }
    return val;
  }, z.number().positive("amount must be a positive number")),
  currency: z.enum(["USD", "NGN"]).optional(),
  description: z.string().optional(),
  category: z.string().min(1).optional(),
  categoryId: objectIdString.optional(),
  date: z.string().optional(),
});

export const updateExpenseSchema = createExpenseSchema
  .partial()
  .refine((obj) => obj && Object.keys(obj).length > 0, {
    message: "At least one field must be provided to update.",
  });

/**
 * Category schemas
 */

export const createCategorySchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().optional(),
  // must be 'Custom' when sent from the client — backend rejects creating 'Global'
  type: z.enum(["Custom", "Global"]).optional(),
});

export const updateCategorySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  color: z.string().optional(),
});

/**
 * Budgets
 * periodStart: ISO date string representing the start of the period (e.g., 2025-12-01)
 */
export const createBudgetSchema = z.object({
  categoryId: objectIdString.optional(),
  category: z.string().min(1).optional(),
  // require periodStart ISO date string (client should provide, e.g. "2025-12-01")
  periodStart: z.string().refine((s) => !s || !Number.isNaN(Date.parse(s)), {
    message: "invalid periodStart date",
  }),
  amount: z.preprocess((v) => {
    if (typeof v === "string" && v.trim() !== "") {
      const n = Number(v);
      return isNaN(n) ? v : n;
    }
    return v;
  }, z.number().positive("amount must be a positive number")),
});

export const updateBudgetSchema = createBudgetSchema
  .partial()
  .refine((obj) => obj && Object.keys(obj).length > 0, {
    message: "At least one field must be provided to update.",
  });
