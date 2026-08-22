import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "@drizzle/schema";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first.");
}

// `prepare: false` — required for Supabase's pooled connection (pgbouncer,
// transaction mode) which doesn't support prepared statements.
const client = postgres(connectionString, { prepare: false });

export const db = drizzle(client, { schema, casing: "snake_case" });
