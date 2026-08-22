import type { Metadata } from "next";
import { NewChallengeForm } from "./new-challenge-form";

export const metadata: Metadata = { title: "Nieuwe challenge" };

export default function NewChallengePage() {
  return (
    <div className="max-w-md space-y-6">
      <h1 className="text-xl font-semibold tracking-tight">Nieuwe challenge</h1>
      <NewChallengeForm />
    </div>
  );
}
