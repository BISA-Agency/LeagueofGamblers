import "dotenv/config";
import { defineConfig } from "drizzle-kit";

// `generate` only reads the schema and never connects, so a placeholder is fine
// when DATABASE_URL isn't set yet. `migrate`/`push`/`studio` need a real one.
export default defineConfig({
  schema: "./drizzle/schema/index.ts",
  out: "./drizzle/migrations",
  dialect: "postgresql",
  dbCredentials: {
    url: process.env.DATABASE_URL ?? "postgres://localhost:5432/placeholder",
  },
  casing: "snake_case",
  // We only own the public schema — auth.users is Supabase's, referenced only
  // for FK typing (see drizzle/schema/_auth.ts). Without this, drizzle-kit
  // tries to generate a CREATE TABLE for it too.
  schemaFilter: ["public"],
});
