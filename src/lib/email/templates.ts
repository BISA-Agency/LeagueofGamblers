import { getSiteUrl } from "@/lib/site-url";

/** Minimal, inline-styled HTML — mail clients strip everything clever. */
function layout(title: string, body: string): string {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#0f0f0f;font-family:-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;color:#e8e8e8">
  <div style="max-width:520px;margin:0 auto;background:#161616;border:1px solid #2a2a2a;border-radius:12px;padding:24px">
    <p style="margin:0 0 16px;font-size:15px;font-weight:600">League of <span style="color:#b8ff2e">Gamblers</span></p>
    <h1 style="margin:0 0 16px;font-size:18px;font-weight:600">${title}</h1>
    ${body}
  </div>
</body></html>`;
}

function row(label: string, value: string): string {
  return `<tr>
    <td style="padding:6px 12px 6px 0;color:#9a9a9a;font-size:13px;white-space:nowrap">${label}</td>
    <td style="padding:6px 0;font-size:13px;word-break:break-all">${value}</td>
  </tr>`;
}

export function buyInClaimEmail(claim: {
  username: string;
  challengeName: string;
  amount: number;
  feeAmount: number;
  tokenAmount: number | null;
  networkLabel: string;
  txHash: string;
  explorerUrl: string | null;
}): { subject: string; html: string } {
  const adminUrl = `${getSiteUrl()}/admin/payments`;
  const money = (n: number) => `€${n.toLocaleString("nl-NL")}`;

  const body = `
    <table style="border-collapse:collapse;width:100%">
      ${row("Speler", claim.username)}
      ${row("Challenge", claim.challengeName)}
      ${row("Bedrag", `${money(claim.amount)} inleg${claim.feeAmount > 0 ? ` + ${money(claim.feeAmount)} servicekosten` : ""}`)}
      ${row("Verwacht", claim.tokenAmount !== null ? `${claim.tokenAmount.toFixed(2)} USDT` : "—")}
      ${row("Netwerk", claim.networkLabel)}
      ${row("Transactie", `<code style="font-size:12px">${claim.txHash}</code>`)}
    </table>
    <div style="margin-top:20px">
      ${
        claim.explorerUrl
          ? `<a href="${claim.explorerUrl}" style="display:inline-block;margin-right:8px;padding:10px 16px;border:1px solid #2a2a2a;border-radius:8px;color:#e8e8e8;text-decoration:none;font-size:13px">Bekijk op de chain</a>`
          : ""
      }
      <a href="${adminUrl}" style="display:inline-block;padding:10px 16px;background:#b8ff2e;border-radius:8px;color:#0f0f0f;text-decoration:none;font-size:13px;font-weight:600">Goedkeuren in admin</a>
    </div>
    <p style="margin:20px 0 0;color:#7a7a7a;font-size:12px">
      De speler staat pas in de challenge nadat je dit hebt goedgekeurd.
    </p>`;

  return {
    subject: `Inleg te controleren — ${claim.username} · ${claim.challengeName}`,
    html: layout("Nieuwe inleg ingediend", body),
  };
}

function button(label: string, url: string): string {
  return `<a href="${url}" style="display:inline-block;margin-top:20px;padding:10px 16px;background:#b8ff2e;border-radius:8px;color:#0f0f0f;text-decoration:none;font-size:13px;font-weight:600">${label}</a>`;
}

/** Sent the moment someone joins a challenge, before they've paid. */
export function pendingPaymentEmail(data: {
  username: string;
  challengeName: string;
  buyInAmount: number;
  feeAmount: number;
  payUrl: string;
}): { subject: string; html: string } {
  const money = (n: number) => `€${n.toLocaleString("nl-NL")}`;
  const total = data.buyInAmount + data.feeAmount;

  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5">
      Hoi ${data.username}, je staat ingeschreven voor <strong>${data.challengeName}</strong> —
      alleen je inleg moet nog binnenkomen voordat je kunt meespelen.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.5">
      Je betaalt ${money(total)}${
        data.feeAmount > 0
          ? ` (${money(data.buyInAmount)} inleg + ${money(data.feeAmount)} servicekosten)`
          : ""
      } in USDT, rechtstreeks in de app.
    </p>
    ${button("Betaal je inleg", data.payUrl)}`;

  return {
    subject: `Nog even betalen — ${data.challengeName}`,
    html: layout("Je inleg staat nog open", body),
  };
}

/** Sent once an admin approves the crypto buy-in — this is what actually lets someone play. */
export function challengeWelcomeEmail(data: {
  username: string;
  challengeName: string;
  startingBalance: number;
  appUrl: string;
}): { subject: string; html: string } {
  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5">
      Hoi ${data.username}, je inleg is bevestigd — je doet mee aan
      <strong>${data.challengeName}</strong>.
    </p>
    <p style="margin:0;font-size:14px;line-height:1.5">
      Je start met <strong>€${data.startingBalance.toLocaleString("nl-NL")}</strong> virtueel
      geld. Zet 'm om in de hoogste eindstand.
    </p>
    ${button("Naar de challenge", data.appUrl)}`;

  return {
    subject: `Welkom in ${data.challengeName}`,
    html: layout("Je doet mee!", body),
  };
}

/** Sent to every paid participant once an admin closes out a finished challenge. */
export function challengeFinishedEmail(data: {
  username: string;
  challengeName: string;
  finalRank: number;
  playerCount: number;
  balance: number;
  prizeAmount: number;
  needsPayoutAddress: boolean;
  payoutUrl: string;
}): { subject: string; html: string } {
  const money = (n: number) => `€${n.toLocaleString("nl-NL")}`;
  const won = data.prizeAmount > 0;

  const body = `
    <p style="margin:0 0 16px;font-size:14px;line-height:1.5">
      Hoi ${data.username}, <strong>${data.challengeName}</strong> zit erop. Je eindigde op
      <strong>#${data.finalRank} van de ${data.playerCount}</strong>, met een eindsaldo van
      ${money(data.balance)}.
    </p>
    ${
      won
        ? `<p style="margin:0 0 16px;font-size:14px;line-height:1.5">
             Dat is goed voor <strong style="color:#b8ff2e">${money(data.prizeAmount)}</strong>
             prijzengeld. Prijzengeld wordt buiten de app uitbetaald door de beheerder, naar het
             USDT-adres in je profiel.
           </p>`
        : ""
    }
    ${
      data.needsPayoutAddress
        ? `<p style="margin:0;font-size:14px;line-height:1.5;color:#e0c25a">
             Je hebt nog geen uitbetaaladres ingesteld — vul die in zodat je prijzengeld ergens
             naartoe kan.
           </p>
           ${button("Uitbetaaladres instellen", data.payoutUrl)}`
        : ""
    }`;

  return {
    subject: won
      ? `Je hebt geld gewonnen — ${data.challengeName}`
      : `${data.challengeName} is afgelopen`,
    html: layout("Challenge afgerond", body),
  };
}
