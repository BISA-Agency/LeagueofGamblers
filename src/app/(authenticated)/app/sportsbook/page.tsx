import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Sportsbook" };

export default function SportsbookPage() {
  return (
    <ComingSoon
      title="Sportsbook"
      description="Het sportsbook met wekelijkse odds en de bet slip komen in Fase 1."
    />
  );
}
