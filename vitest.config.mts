import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";
import { readFileSync, existsSync } from "node:fs";

// .mts so Vite loads this as ESM (a .ts config is read as CommonJS here and
// warns on the import syntax below).

/**
 * Load .env into process.env before the test run.
 *
 * Integration tests talk to a real Postgres — these are database-semantics
 * behaviours (conditional updates, transaction isolation, unique constraints)
 * and a mocked client would happily "pass" while the real thing raced. Vitest
 * does not read .env on its own, and no dotenv dependency is needed for a
 * handful of KEY=value lines.
 */
function loadEnv(file: string) {
  if (!existsSync(file)) return;
  for (const raw of readFileSync(file, "utf8").split("\n")) {
    const line = raw.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadEnv(fileURLToPath(new URL(".env", import.meta.url)));

export default defineConfig({
  resolve: {
    // Mirrors the `@/*` alias in tsconfig.json so tests can import app modules
    // the same way application code does.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
  test: {
    // Integration tests share one Postgres database. Running files in parallel
    // would let one suite's cleanup delete another's fixtures mid-assertion, so
    // files run one at a time. Individual tests inside a file still run in
    // order, and the concurrency tests drive parallelism explicitly with
    // Promise.all where that is the behaviour under test.
    fileParallelism: false,
    // Concurrency tests wait on real transactions; the 5s default is tight.
    testTimeout: 30_000,
    hookTimeout: 30_000,
  },
});
