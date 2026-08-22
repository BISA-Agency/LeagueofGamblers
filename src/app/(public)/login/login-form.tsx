"use client";

import { useActionState } from "react";
import Link from "next/link";
import { Inbox, MailWarning } from "lucide-react";
import { requestLoginCode, verifyLoginCode, type AuthActionState } from "@/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: AuthActionState = { status: "idle" };

export function LoginForm({ next, mode }: { next: string; mode: "login" | "register" }) {
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
  const registering = mode === "register";

  return (
    <div className="space-y-6">
      <div className="space-y-1 text-center">
        <h1 className="text-2xl font-semibold tracking-tight">
          {registering ? "Account maken" : "Inloggen"}
        </h1>
        <p className="text-sm text-muted-foreground">
          Geen wachtwoord nodig — we sturen je een inlogcode per e-mail.
        </p>
      </div>

      {step === "request" ? (
        <>
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
                autoComplete="email"
                className="h-11"
              />
            </div>
            {requestState.status === "error" && (
              <p role="alert" className="text-sm text-loss">
                {requestState.message}
              </p>
            )}
            <Button type="submit" className="h-11 w-full" disabled={requestPending}>
              {requestPending
                ? "Versturen…"
                : registering
                  ? "Account maken"
                  : "Stuur inlogcode"}
            </Button>
          </form>

          {/* Login and registration are the same action here: the first time
              an address is used, the account is created. Saying so avoids
              people hunting for a signup button that doesn't exist. */}
          <p className="text-center text-sm text-muted-foreground">
            {registering ? (
              <>
                Heb je al een account?{" "}
                <Link href="/login" className="text-accent-brand underline underline-offset-2">
                  Inloggen
                </Link>
              </>
            ) : (
              <>
                Nog geen account?{" "}
                <Link
                  href="/login?mode=register"
                  className="text-accent-brand underline underline-offset-2"
                >
                  Maak er hier een
                </Link>{" "}
                — het gaat met hetzelfde formulier.
              </>
            )}
          </p>
        </>
      ) : (
        <form action={verifyAction} className="space-y-4">
          <input type="hidden" name="next" value={next} />
          <input type="hidden" name="email" value={email} />

          <div className="flex items-start gap-3 rounded-lg border border-border bg-secondary/30 p-3">
            <Inbox className="mt-0.5 size-4 shrink-0 text-accent-brand" />
            <p className="text-sm text-muted-foreground">
              We hebben een link én een inlogcode gestuurd naar{" "}
              <span className="font-medium text-foreground">{email}</span>. Klik op de link, of
              vul de code hieronder in.
            </p>
          </div>

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

          {/* The single most common support question for magic links. */}
          <div className="flex items-start gap-3 rounded-lg border border-border p-3">
            <MailWarning className="mt-0.5 size-4 shrink-0 text-muted-foreground" />
            <p className="text-xs text-muted-foreground">
              Geen mail binnen een minuut? Kijk in je <strong>spam- of ongewenste-mailmap</strong>
              . Zet <span className="text-foreground">League of Gamblers</span> daarna op veilig,
              dan komt de volgende gewoon aan.
            </p>
          </div>
        </form>
      )}
    </div>
  );
}
