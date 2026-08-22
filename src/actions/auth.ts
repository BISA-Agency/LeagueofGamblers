"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";

export type AuthActionState = {
  status: "idle" | "sent" | "error";
  message?: string;
  email?: string;
};

export async function requestLoginCode(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const next = String(formData.get("next") ?? "/app");

  if (!email || !email.includes("@")) {
    return { status: "error", message: "Vul een geldig e-mailadres in." };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${SITE_URL}/auth/confirm?next=${encodeURIComponent(next)}`,
    },
  });

  if (error) {
    return { status: "error", message: "Versturen mislukt. Probeer het opnieuw." };
  }

  return { status: "sent", email };
}

export async function verifyLoginCode(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const token = String(formData.get("token") ?? "").trim();
  const next = String(formData.get("next") ?? "/app");

  if (!token) {
    return { status: "error", message: "Vul de 6-cijferige code in.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    return { status: "error", message: "Onjuiste of verlopen code. Probeer het opnieuw.", email };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
