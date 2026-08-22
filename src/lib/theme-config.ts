export type AccentTheme = "lime" | "gold";

// Switch the brand accent color for the whole app via env, no code changes needed.
// See PLAN.md §7 — both variants are fully themed, default is "lime".
export const ACCENT_THEME: AccentTheme =
  process.env.NEXT_PUBLIC_ACCENT_THEME === "gold" ? "gold" : "lime";
