import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

/**
 * Unit tests for the pure logic — settlement rules, odds parsing, stats.
 * Anything that needs the database or the network is covered by running the
 * app, not from here.
 *
 * The aliases mirror tsconfig.json so a test imports a module exactly the way
 * the app does.
 */
export default defineConfig({
  resolve: {
    alias: {
      "@": fileURLToPath(new URL("./src", import.meta.url)),
      "@drizzle": fileURLToPath(new URL("./drizzle", import.meta.url)),
    },
  },
  test: {
    include: ["src/**/*.test.ts"],
  },
});
