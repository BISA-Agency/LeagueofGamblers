"use client";

import { HelpCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

/**
 * A stylised drawing, not a screenshot of a real wallet. Wallets and exchanges
 * all lay their transaction screen out differently and redesign it every few
 * months, so a picture of one would be wrong for most people and out of date
 * for the rest. What every one of them has in common is a long row of
 * characters labelled something like "Transaction ID" — this points at that.
 */
function TransactionDiagram() {
  return (
    <svg viewBox="0 0 300 180" className="w-full" role="img" aria-label="Voorbeeld van een transactiescherm">
      <rect x="4" y="4" width="292" height="172" rx="10" className="fill-secondary/40 stroke-border" strokeWidth="1" />

      <text x="20" y="30" className="fill-muted-foreground" fontSize="9">Transactiedetails</text>

      <text x="20" y="54" className="fill-muted-foreground" fontSize="9">Status</text>
      <text x="120" y="54" className="fill-profit" fontSize="9" fontWeight="600">Voltooid</text>

      <text x="20" y="74" className="fill-muted-foreground" fontSize="9">Bedrag</text>
      <text x="120" y="74" className="fill-foreground" fontSize="9">1,29 USDT</text>

      <text x="20" y="94" className="fill-muted-foreground" fontSize="9">Naar</text>
      <text x="120" y="94" className="fill-foreground" fontSize="9">TFb2CYgD7bkm…</text>

      {/* The row that matters. */}
      <rect x="12" y="106" width="276" height="42" rx="6" className="fill-accent-brand/10 stroke-accent-brand" strokeWidth="1.5" />
      <text x="20" y="122" className="fill-accent-brand" fontSize="9" fontWeight="600">
        Transactie-ID  /  Hash  /  TxID
      </text>
      <text x="20" y="139" className="fill-foreground" fontSize="8" fontFamily="monospace">
        9f2c1a7b3e5d4c8a1b2f3e4d5c6b7a89012345…
      </text>

      <text x="20" y="166" className="fill-muted-foreground" fontSize="8">
        Dit lange nummer heb ik nodig
      </text>
    </svg>
  );
}

export function TxidHelp() {
  return (
    <Dialog>
      <DialogTrigger
        className="flex size-5 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
        aria-label="Uitleg: waar vind ik de transactiehash?"
      >
        <HelpCircle className="size-4" />
      </DialogTrigger>

      <DialogContent className="max-h-[85dvh] overflow-y-auto sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Waar vind ik de transactiehash?</DialogTitle>
          <DialogDescription>
            Elke crypto-overboeking krijgt een uniek nummer, een beetje als een bonnummer.
            Daarmee kan ik jouw betaling terugvinden, ook als er tien mensen tegelijk betalen.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-5 text-sm">
          <div className="rounded-lg border border-border p-3">
            <TransactionDiagram />
          </div>

          <section className="space-y-1.5">
            <h3 className="font-medium">Betaal je vanuit een wallet-app?</h3>
            <p className="text-muted-foreground">
              Bijvoorbeeld Trust Wallet, MetaMask of Phantom. Open de transactie die je net hebt
              verstuurd en tik op <strong className="text-foreground">Details</strong>. Zoek de
              regel <strong className="text-foreground">Transaction ID</strong>,{" "}
              <strong className="text-foreground">Hash</strong> of{" "}
              <strong className="text-foreground">TxID</strong> en kopieer die.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">Betaal je vanaf een exchange?</h3>
            <p className="text-muted-foreground">
              Bijvoorbeeld Binance, Bybit, Coinbase of Kraken. Ga naar je{" "}
              <strong className="text-foreground">opnamegeschiedenis</strong> (Withdrawal history)
              en open de opname die je zojuist deed. Daar staat{" "}
              <strong className="text-foreground">TxID</strong> of{" "}
              <strong className="text-foreground">Transaction Hash</strong>.
            </p>
            <p className="text-muted-foreground">
              Staat de opname nog op &quot;in behandeling&quot;? Dan is er nog geen hash. Wacht
              tot hij verzonden is — meestal een paar minuten.
            </p>
          </section>

          <section className="space-y-1.5">
            <h3 className="font-medium">Hoe herken je hem?</h3>
            <p className="text-muted-foreground">
              Een lange rij letters en cijfers, meestal 64 tekens. Op Ethereum en BNB Chain begint
              hij met <code className="font-mono text-[0.9em] text-foreground">0x</code>. Verwar hem niet met
              het <em>adres</em> waar je naartoe stuurde — dat is korter.
            </p>
          </section>

          <p className="rounded-lg border border-border bg-secondary/30 p-3 text-xs text-muted-foreground">
            Kopieer en plak hem altijd. Overtypen gaat bijna altijd mis, en met één verkeerd teken
            kan ik je betaling niet terugvinden.
          </p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
