// packages/client/src/services/authService.ts
import { api } from "@/lib";
import { LoginPayload, AuthResponse, RegisterPayload } from "@/types/auth";

export const loginApi = async (
  payload: LoginPayload
): Promise<AuthResponse> => {
  const resp = await api.post("/api/auth/login", payload);
  return resp.data as AuthResponse;
};

export const registerApi = async (
  payload: RegisterPayload
): Promise<AuthResponse> => {
  const resp = await api.post("/api/auth/register", payload);
  return resp.data as AuthResponse;
};
