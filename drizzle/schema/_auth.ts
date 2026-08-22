import { pgSchema, uuid } from "drizzle-orm/pg-core";

// Stub for Supabase's own auth.users table — managed by Supabase Auth, not by
// our migrations. Declared only so profiles.id can carry a real FK reference.
export const authSchema = pgSchema("auth");

export const authUsers = authSchema.table("users", {
  id: uuid("id").primaryKey(),
});
