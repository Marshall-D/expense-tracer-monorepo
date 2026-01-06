// packages/server/src/lib/env.ts
export function assertEnv(name: string, hint?: string) {
  const v = process.env[name];
  if (!v || v === "__REPLACE_ME__" || v === "__CI_PLACEHOLDER__") {
    console.error(
      `Missing required environment variable: ${name}. ${hint || ""}`
    );
    // exit with non-zero so process managers / CI notice
    process.exit(1);
  }
}
