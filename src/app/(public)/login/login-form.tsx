"use client";

import { useActionState } from "react";
import { requestLoginCode, verifyLoginCode, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle" };

export function LoginForm({ next }: { next: string }) {
  const [requestState, requestAction, requestPending] = useActionState(
    requestLoginCode,
    initialState
  );
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyLoginCode,
    initialState
  );

  const email = verifyState.email ?? requestState.email;
  const step = requestState.status === "sent" && email ? "verify" : "request";

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">Inloggen</h1>
        <p className="text-sm text-muted-foreground">
          Geen wachtwoord nodig — we sturen je een inlogcode per e-mail.
        </p>
      </div>

      {step === "request" ? (
        <form action={requestAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <div className="space-y-2">
            <Label htmlFor="email">E-mailadres</Label>
            <Input
              id="email"
              name="email"
              type="email"
              placeholder="jij@voorbeeld.nl"
              required
              autoFocus
              className="h-11"
            />
          </div>
          {requestState.status === "error" && (
            <p role="alert" className="text-sm text-loss">
              {requestState.message}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={requestPending}>
            {requestPending ? "Versturen…" : "Stuur inlogcode"}
          </Button>
        </form>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />
          <p className="text-sm text-muted-foreground">
            We hebben een link én een inlogcode gestuurd naar{" "}
            <span className="text-foreground">{email}</span>. Klik op de link in de e-mail,
            of vul de code hieronder in.
          </p>
          <div className="space-y-2">
            <Label htmlFor="token">Inlogcode</Label>
            <Input
              id="token"
              name="token"
              inputMode="numeric"
              autoComplete="one-time-code"
              // Supabase's OTP length is a project setting (6–10). This was
              // capped at 6 while the project issues 8, so the code was
              // silently truncated and every attempt failed. Cap at the
              // maximum instead of guessing the current setting.
              maxLength={10}
              placeholder="12345678"
              required
              autoFocus
              className="h-11 tracking-widest"
            />
          </div>
          {verifyState.status === "error" && (
            <p role="alert" className="text-sm text-loss">
              {verifyState.message}
            </p>
          )}
          <Button type="submit" className="h-11 w-full" disabled={verifyPending}>
            {verifyPending ? "Controleren…" : "Inloggen"}
          </Button>
        </form>
      )}
    </div>
  );
}
