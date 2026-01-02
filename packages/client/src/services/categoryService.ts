// packages/client/src/services/categoryService.ts
import api from "@/lib/api";
import { Category } from "@/types/categories";

/**
 * Normalizes axios / fetch errors into a predictable shape:
 * { message, status?, code?, friendlyMessage?, field? , originalError }
 */
function normalizeApiError(err: any) {
  const out: any = {
    message: err?.message ?? "Request failed",
    originalError: err,
  };

  const resp = err?.response ?? err;
  if (resp) {
    out.status = resp?.status;
    out.code = resp?.data?.error;
    out.serverMessage = resp?.data?.message ?? resp?.statusText;
  }

  // map known server error shapes to friendly messages & field hints
  if (out.status === 409 || out.code === "category_exists") {
    out.friendlyMessage =
      resp?.data?.message ??
      "A category with that name already exists. Choose a different name or edit the existing one.";
    // backend collision is about `name`
    out.field = "name";
  }

  return out;
}

export const fetchCategories = async (
  includeGlobal = true
): Promise<Category[]> => {
  const resp = await api.get<{ data: Category[] }>("/api/categories", {
    params: { includeGlobal },
  });
  return resp.data?.data ?? [];
};

export const getCategory = async (id: string): Promise<Category> => {
  const resp = await api.get<{ data: Category }>(`/api/categories/${id}`);
  return resp.data.data;
};

export const createCategory = async (payload: {
  name: string;
  color?: string;
}) => {
  try {
    // server expects type: 'Custom' (server will enforce)
    const resp = await api.post("/api/categories", {
      ...payload,
      type: "Custom",
    });
    return resp.data;
  } catch (err: any) {
    const normalized = normalizeApiError(err);
    // throw the normalized object so callers can react
    throw normalized;
  }
};

export const updateCategory = async (
  id: string,
  payload: { name?: string; color?: string }
) => {
  try {
    const resp = await api.put(`/api/categories/${id}`, payload);
    return resp.data;
  } catch (err: any) {
    const normalized = normalizeApiError(err);
    throw normalized;
  }
};

export const deleteCategory = async (id: string) => {
  try {
    const resp = await api.delete(`/api/categories/${id}`);
    return resp.data;
  } catch (err: any) {
    const normalized = normalizeApiError(err);
    throw normalized;
  }
};
