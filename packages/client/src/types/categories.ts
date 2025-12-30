// packages/client/src/types/categories.ts

export type Category = {
  id: string;
  name: string;
  color?: string;
  type: "Global" | "Custom";
  userId?: string | null;
};
