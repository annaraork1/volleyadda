/**
 * Phase 8 — Seed TNHVPL Season 5 under one organiser login.
 *
 * Usage:
 *   npm run seed:s5
 *
 * Loads `.env` then `.env.local` (later wins). Shared Upstash = one store for
 * local + production only when Vercel uses the same KV_* credentials.
 *
 * To seed production when Redis differs:
 *   1. Sign in as a SUPERADMIN_EMAILS account on https://volleyadda.vercel.app
 *   2. POST /api/admin/seed-s5 (browser console or curl with session cookie)
 *   Or pull prod env into `.env.local` and re-run this script.
 */
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");

function loadEnvFile(path) {
  if (!existsSync(path)) return;
  const text = readFileSync(path, "utf8");
  for (const line of text.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq < 1) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    process.env[key] = val;
  }
}

loadEnvFile(join(ROOT, ".env"));
loadEnvFile(join(ROOT, ".env.local"));

async function main() {
  const prefix = process.env.REDIS_KEY_PREFIX || "vada:";
  const hasKv = !!(process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL);
  console.log(`Seed TNHVPL S5`);
  console.log(`Redis: ${hasKv ? "Upstash" : "in-memory"} · prefix ${prefix}`);
  console.log(`APP_URL: ${process.env.APP_URL || "(unset)"}`);

  const { seedTnhvplS5, S5_OWNER_EMAIL } = await import(
    pathToFileURL(join(ROOT, "lib/seedTnhvplS5.ts")).href
  );

  const result = await seedTnhvplS5();
  const base = (process.env.APP_URL || "").replace(/\/$/, "");
  console.log("");
  console.log("Done.");
  console.log(`  owner:      ${result.ownerEmail || S5_OWNER_EMAIL}`);
  console.log(`  key:        ${result.key}`);
  console.log(`  publicCode: ${result.publicCode || "(none)"}`);
  console.log(`  created:    ${result.created}`);
  console.log(`  cloneFrom:  ${result.cloneFrom || "(blank)"}`);
  console.log(`  stage:      ${result.stage}`);
  console.log(`  teams:      ${result.teams}`);
  console.log(`  players:    ${result.players}`);
  console.log(`  hub:        ${base}/tournament/${result.key}`);
  console.log(`  share:      ${base}/s/${result.key}`);
  console.log("");
  console.log(
    "If production lookup still 404s, prod Redis ≠ local. Sign in as superadmin on prod and POST /api/admin/seed-s5.",
  );
}

main().catch((e) => {
  console.error("Seed failed:", e?.message || e);
  process.exit(1);
});
