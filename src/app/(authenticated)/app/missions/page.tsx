import type { Metadata } from "next";
import { ComingSoon } from "@/components/coming-soon";

export const metadata: Metadata = { title: "Missies" };

export default function MissionsPage() {
  return (
    <ComingSoon title="Missies" description="Missies met voortgang en beloningen komen in Fase 1." />
  );
}
