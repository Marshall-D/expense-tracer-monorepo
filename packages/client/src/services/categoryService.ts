// packages/client/src/services/categoryService.ts

import api from "@/lib/api";
import { Category } from "@/types/categories";

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
  // server expects type: 'Custom' (server will enforce)
  const resp = await api.post("/api/categories", {
    ...payload,
    type: "Custom",
  });
  return resp.data;
};

export const updateCategory = async (
  id: string,
  payload: { name?: string; color?: string }
) => {
  const resp = await api.put(`/api/categories/${id}`, payload);
  return resp.data;
};

export const deleteCategory = async (id: string) => {
  const resp = await api.delete(`/api/categories/${id}`);
  return resp.data;
};
