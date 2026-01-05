// packages/client/src/lib/index.ts

export { api } from "./api";
export { queryKeys } from "./queryKeys";

export {
  TOKEN_KEY,
  USER_KEY,
  setToken,
  getToken,
  removeToken,
  setUser,
  getUser,
  removeUser,
} from "./storage";

export { t } from "./toast";

export { cn } from "./utils";

export { downloadResponseAsFile } from "./download";
export { monthLabel, monthShort, monthToRange } from "./date";
export { formatNGN, formatNGNWithDecimals } from "./number";
export { validateEmail, validatePassword, validateName } from "./authValidator";
