import { boolean, pgEnum, pgTable, text, uuid } from "drizzle-orm/pg-core";

export const badgeRarityEnum = pgEnum("badge_rarity", [
  "common",
  "rare",
  "epic",
  "legendary",
]);

export const badges = pgTable("badges", {
  id: uuid("id").primaryKey().defaultRandom(),
  slug: text("slug").notNull().unique(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  // A lucide-react icon name (see lib/badges/icon.tsx), or an uploaded image URL.
  icon: text("icon").notNull(),
  rarity: badgeRarityEnum("rarity").notNull(),
  isSystem: boolean("is_system").notNull().default(true),
});

export type Badge = typeof badges.$inferSelect;
export type NewBadge = typeof badges.$inferInsert;
