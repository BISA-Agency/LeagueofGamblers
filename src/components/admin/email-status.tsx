import { AlertTriangle, Check } from "lucide-react";

/**
 * Whether outgoing mail is actually wired up, read at request time on the
 * server. Only ever reports presence and the domain of the from-address —
 * never a key, never the notify address in full.
 *
 * This exists because "no mail arrived" has two very different causes: the
 * app never called the provider, or the provider refused it. Without this the
 * only way to tell them apart is reading deploy logs.
 */
export function EmailStatus() {
  const checks = [
    { key: "RESEND_API_KEY", ok: Boolean(process.env.RESEND_API_KEY?.trim()) },
    { key: "ADMIN_NOTIFY_EMAIL", ok: Boolean(process.env.ADMIN_NOTIFY_EMAIL?.trim()) },
    { key: "EMAIL_FROM", ok: Boolean(process.env.EMAIL_FROM?.trim()) },
  ];
  const missing = checks.filter((c) => !c.ok);

  const from = process.env.EMAIL_FROM?.trim();
  // A pasted-in quote is the mistake this catches: Vercel takes the value
  // literally, so "Naam <a@b.nl>" with the quotes is an invalid sender.
  const quoted = Boolean(from && (from.startsWith('"') || from.endsWith('"')));

  if (missing.length === 0 && !quoted) {
    return (
      <p className="flex items-center gap-2 rounded-lg border border-profit/30 bg-profit/10 p-3 text-xs text-profit">
        <Check className="size-4 shrink-0" />
        E-mailmeldingen staan aan.
        {from && <span className="text-profit/70">Afzender: {from}</span>}
      </p>
    );
  }

  return (
    <div className="space-y-1.5 rounded-lg border border-loss/30 bg-loss/10 p-3 text-xs text-loss">
      <p className="flex items-center gap-2 font-medium">
        <AlertTriangle className="size-4 shrink-0" />
        E-mailmeldingen staan uit — betalingen komen alleen hier binnen.
      </p>
      {missing.length > 0 && (
        <p>
          Ontbreekt in deze deployment:{" "}
          <span className="font-mono">{missing.map((m) => m.key).join(", ")}</span>. Zet ze in
          Vercel op Production en deploy daarna opnieuw — een bestaande deployment pikt nieuwe
          variabelen niet op.
        </p>
      )}
      {quoted && (
        <p>
          <span className="font-mono">EMAIL_FROM</span> staat tussen aanhalingstekens. Haal die
          weg: Vercel neemt de waarde letterlijk over.
        </p>
      )}
    </div>
  );
}
