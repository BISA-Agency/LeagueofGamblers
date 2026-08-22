# DECISIONS.md

Keuzes die ik onderweg heb gemaakt, met motivatie. Zie PLAN.md §12.7.

## Fase 0

**Next.js 16 in plaats van 15.**
`create-next-app@latest` installeerde 16.3.2 — de spec noemt versie 15,
vermoedelijk simpelweg de laatste versie op het moment van schrijven. 16 is nu
de laatste stabiele major. Laat het weten als je bewust op 15 wilt pinnen.

**shadcn/ui: Radix-primitives, Nova-preset (Lucide + Geist).**
De shadcn CLI raadt tegenwoordig "Base UI" als standaard aan, maar Radix is
de langst gevestigde standaard met de meeste community-documentatie — een
veiligere keuze voor een groot, AI-gedreven traject. Nova-preset matcht direct
de gevraagde stack (Lucide-iconen, Geist-font).

**Eén thema: alleen dark, geen light/dark-toggle.**
De spec noemt "dark theme standaard" maar nergens een light-mode-toggle in
~5000 woorden ontwerpbeschrijving. Geïnterpreteerd als: dark is het enige
thema, niet alleen de standaard.

**Accentkleur (lime/goud) via env var, niet als UI-toggle.**
`NEXT_PUBLIC_ACCENT_THEME=lime|gold` in `.env.local`, uitgelezen in
`src/lib/theme-config.ts` en gezet als `data-accent` op `<html>`. Spec §13
zegt "laat me kiezen" — geïnterpreteerd als een keuze voor de eigenaar van de
deploy (env var), niet een instelling die spelers zelf per sessie wisselen.
Beide varianten zijn volledig als CSS-tokens uitgewerkt in `globals.css`.

**Avatar-upload uitgesteld naar Fase 1.**
Spec biedt zelf een alternatief: "automatisch gegenereerde avatar op basis
van de gebruikersnaam" (`src/components/profile/generated-avatar.tsx`,
deterministisch, geen externe dienst). Echte upload komt in Fase 1 samen met
de Supabase Storage buckets die toch nodig zijn voor bewijsbet-screenshots —
dan is de upload-flow in één keer goed te bouwen i.p.v. twee keer.

**Gebruikersnaam-immutabiliteit tijdens lopende challenge: nog niet
afgedwongen.**
Er is in Fase 0 nog geen UI om je gebruikersnaam te wijzigen (profiel
bewerken doet alleen bio/status/favorieten), dus de regel is triviaal waar —
er is niets te blokkeren. Bouw de check pas als er een edit-flow voor
gebruikersnaam bijkomt.

**`/onboarding` buiten de `(authenticated)`-route-group.**
PLAN.md schetste onboarding onder dezelfde shell als `/app/*`. In de
implementatie staat `/onboarding` als eigen top-level route (geen
bottom-nav/sidebar tijdens onboarding, en geen pathname-detectie nodig in een
gedeelde layout om de shell te verbergen). Zuiver een mapindeling — de URL en
het gedrag zijn ongewijzigd.

**`prize_tiers` en de live potverdeling: bewust niet in Fase 0.**
Staat al zo in PLAN.md's Fase 1-checklist; bevestigd tijdens het bouwen dat
`challenges`/`challenge_participants` in Fase 0 zonder de staffel-tabel
kunnen (de publieke challenge-pagina toont nu alleen het ruwe aantal betaalde
spelers × inleg, geen verdeling).

**Saldo wordt nog niet automatisch op startsaldo gezet bij challenge-start.**
`challenge_participants.balance` staat op 0 tot een deelnemer join't; het
zetten van `balance = startingBalance` hoort bij de `draft → live`-overgang
(cron/admin), die pas in Fase 1 gebouwd wordt. Nu bewust leeg gelaten i.p.v.
een verkeerd getal te tonen.

**Admin moet zelf ook onboarden vóór hij een challenge aanmaakt.**
`challenges.created_by` heeft een FK naar `profiles.id`. Een admin die nog
geen profiel heeft (nooit door onboarding is gegaan) krijgt een FK-fout bij
het aanmaken van een challenge. Geaccepteerd randgeval — in de praktijk
onboardt de admin net als iedereen voor hij `/admin` gebruikt.

**Europe/Amsterdam-conversie voor challenge-datums.**
`datetime-local` inputs geven geen tijdzone mee. `src/lib/datetime.ts` zet
zo'n waarde expliciet om vanuit Europe/Amsterdam-wandkloktijd naar UTC (met
correcte DST-afhandeling), zodat de spec-eis "alles in UTC opslaan, tonen in
Europe/Amsterdam" (§7) ook echt klopt en niet afhangt van de tijdzone van de
servermachine.

**`auth.users` handmatig uit de eerste migratie verwijderd.**
`drizzle-kit generate` genereert standaard ook een `CREATE TABLE
auth.users`, omdat `drizzle/schema/_auth.ts` die tabel declareert (puur voor
FK-typering naar Supabase's eigen tabel). Dat `CREATE TABLE` is handmatig uit
`drizzle/migrations/0000_*.sql` verwijderd — Supabase beheert die tabel al.
Zie het commentaar bovenin dat migratiebestand.

**`npm run db:migrate` gebruikt een eigen script, niet `drizzle-kit migrate`.**
Getest tegen het echte Supabase-project: de `drizzle-kit migrate` CLI hangt/
faalt stil (exit code 1, geen foutmelding) tegen Supabase's pgbouncer-pooler
in transaction-mode. `scripts/migrate.ts` gebruikt drizzle-orm's eigen
`migrate()` met `prepare: false` (dezelfde instelling als `src/lib/db`) en
werkt wel betrouwbaar. `db:generate` (migraties genereren) gebruikt nog
gewoon de officiële `drizzle-kit generate` CLI — alleen `migrate` (uitvoeren)
had dit probleem.

**Geldbedragen: `numeric(12,2)` in Postgres, `number` in TypeScript.**
Drizzle's `mode: "number"` i.p.v. `"string"` — leesbaarder in code, en de
precisie-afweging is verwaarloosbaar bij realistische inzetten/saldi (ruim
binnen JS' safe-integer-bereik).
