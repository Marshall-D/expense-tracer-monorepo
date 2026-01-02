// packages/client/src/types/auth.ts
export type User = { id: string; name: string; email: string } | null;

export type LoginPayload = { email: string; password: string };
export type RegisterPayload = { name: string; email: string; password: string };

export type AuthResponse = {
  user: User;
  token: string;
};

export type AuthContextValue = {
  user: User;
  token: string | null;
  isAuthenticated: boolean;
  setAuth: (user: User, token: string) => void;
  logout: () => void;
};
