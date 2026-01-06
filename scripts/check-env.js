// scripts/check-env.js
const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, "env-manifest.json");
if (!fs.existsSync(manifestPath)) {
  console.warn("No env-manifest.json found — skipping env checks");
  process.exit(0);
}

const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));

function readPkgEnv(pkgDir) {
  const envPath = path.join(pkgDir, ".env");
  if (!fs.existsSync(envPath)) return {};
  const raw = fs.readFileSync(envPath, "utf8");
  const lines = raw.split(/\r?\n/);
  const map = {};
  for (const l of lines) {
    if (!l || l.startsWith("#")) continue;
    const idx = l.indexOf("=");
    if (idx === -1) continue;
    const k = l.slice(0, idx).trim();
    const v = l.slice(idx + 1);
    map[k] = v;
  }
  return map;
}

let missing = [];
for (const pkg of Object.keys(manifest)) {
  const required = manifest[pkg];
  const env = readPkgEnv(pkg);
  required.forEach((k) => {
    if (!(k in env) || env[k] === "" || env[k].startsWith("__REPLACE")) {
      missing.push({ pkg, key: k });
    }
  });
}

if (missing.length) {
  console.error("Missing environment variables:");
  missing.forEach((m) => {
    console.error(` - ${m.pkg}: ${m.key}`);
  });
  console.error(
    "\nPlease populate .env files (or set env vars) before starting."
  );
  process.exit(1);
}
console.log("All required environment variables present (basic check).");
