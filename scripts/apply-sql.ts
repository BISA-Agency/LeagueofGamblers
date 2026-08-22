// Runs a raw .sql file against the database — for SQL that isn't
// Drizzle-managed (RLS policies, Storage policies). Usage:
//   npm run db:apply-sql supabase/migrations/0001_rls_policies.sql
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const filePath = process.argv[2];
  if (!filePath) {
    throw new Error("Usage: npm run db:apply-sql <path-to-sql-file>");
  }

  const { readFile } = await import("node:fs/promises");
  const postgres = (await import("postgres")).default;

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first.");
  }

  const script = await readFile(filePath, "utf8");
  const client = postgres(connectionString, { prepare: false, max: 1 });

  console.log(`Uitvoeren: ${filePath}`);
  await client.unsafe(script);
  console.log("Klaar.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
