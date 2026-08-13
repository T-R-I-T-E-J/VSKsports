import { defineConfig } from "vitest/config";
import { fileURLToPath } from "node:url";

// .mts so Vite loads this as ESM (a .ts config is read as CommonJS here and
// warns on the import syntax below).
export default defineConfig({
  resolve: {
    // Mirrors the `@/*` alias in tsconfig.json so tests can import app modules
    // the same way application code does.
    alias: { "@": fileURLToPath(new URL(".", import.meta.url)) },
  },
});
