// `drizzle-kit migrate` doesn't reliably work against Supabase's pgbouncer
// pooler in transaction mode (it hangs/fails silently) — this runs the same
// migrations via drizzle-orm's own migrator with `prepare: false`, which does.
import { config } from "dotenv";
config({ path: ".env.local" });

async function main() {
  const postgres = (await import("postgres")).default;
  const { drizzle } = await import("drizzle-orm/postgres-js");
  const { migrate } = await import("drizzle-orm/postgres-js/migrator");

  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set — copy .env.example to .env.local first.");
  }

  const client = postgres(connectionString, { prepare: false, max: 1 });
  const db = drizzle(client);

  console.log("Migraties uitvoeren...");
  await migrate(db, { migrationsFolder: "./drizzle/migrations" });
  console.log("Klaar.");

  await client.end();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
