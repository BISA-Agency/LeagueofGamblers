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
    console.error(`signInWithOtp mislukt voor ${email}: ${error.status} ${error.message}`);
    return { status: "error", message: "Versturen mislukt. Probeer het opnieuw." };
  }

  return { status: "sent", email };
}

export async function verifyLoginCode(
  _prevState: AuthActionState,
  formData: FormData
): Promise<AuthActionState> {
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  // Codes get pasted out of mail clients with stray spaces or a dash in them.
  const token = String(formData.get("token") ?? "").replace(/\D/g, "");
  const next = String(formData.get("next") ?? "/app");

  if (!token) {
    return { status: "error", message: "Vul je inlogcode in.", email };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });

  if (error) {
    // Log the real reason: swallowing it is what made the truncated-code bug
    // take so long to find. The user still gets a friendly message.
    console.error(
      `verifyOtp mislukt voor ${email}: ${error.status} ${error.code ?? ""} ${error.message}`
    );
    return { status: "error", message: "Onjuiste of verlopen code. Probeer het opnieuw.", email };
  }

  redirect(next);
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
