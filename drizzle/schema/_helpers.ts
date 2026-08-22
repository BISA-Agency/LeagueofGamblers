import { customType, numeric } from "drizzle-orm/pg-core";

// Case-insensitive text, backed by Postgres' citext extension.
// Requires `create extension if not exists citext;` — see drizzle/migrations/0000_extensions.sql.
export const citext = customType<{ data: string }>({
  dataType() {
    return "citext";
  },
});

// Monetary amounts: fixed-point, returned as a JS number (values in this app
// stay well within safe-integer range, so the precision loss risk is moot).
export const money = (name: string) =>
  numeric(name, { precision: 12, scale: 2, mode: "number" });
