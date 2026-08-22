# DECISIONS.md

Keuzes die ik onderweg heb gemaakt, met motivatie. Zie PLAN.md §12.7.

## Fase 1

**RLS is defense-in-depth, niet de primaire autorisatielaag.**
De app zelf praat met Postgres via een geprivilegieerde Drizzle-verbinding
(zie `src/lib/db`) en handhaaft autorisatie in servercode (welke challenge,
welke speler, is het admin-email). RLS-policies (§7, `supabase/migrations/
0001_rls_policies.sql`) zijn dus vooral een vangnet voor het
anon/authenticated PostgREST-pad dat Supabase automatisch aanbiedt, en om
Supabase's eigen "RLS disabled"-lintwaarschuwingen weg te nemen — niet de
plek waar "bets pas zichtbaar na event_start" script echt afgedwongen wordt
(dat gebeurt in de queries van de UI zelf).

**Combi-afrekening bij half_won/half_lost-selecties: vereenvoudigd.**
Een quart-lijn (Aziatische handicap, bijv. -0.25) wordt correct afgerekend
als gemiddelde van de twee aangrenzende hele/halve lijnen (zie
`lib/settlement/markets.ts`). Zit zo'n selectie in een **combi** met andere
selecties, dan telt half_lost als verlies en half_won als winst tegen de
volledige odds van die selectie — een echte gesplitste uitbetaling (zoals
bookmakers doen) is niet gebouwd. Voor een MVP van een vriendengroep is dit
een acceptabele vereenvoudiging; Aziatische handicaps in combi's zijn sowieso
een randgeval.

**Prijsuitbetaling aan het einde van een challenge: nog niet gebouwd.**
De `settling → finished`-overgang (eindstand bepalen, staffel toepassen,
`payments`-records met `direction: payout_prize` aanmaken) ontbreekt nog.
Gegeven dat de demo-challenge en de eerste echte challenge (start
2026-09-01, 30 dagen) nog niet aflopen, is dit bewust naar later verschoven
— wel een reëel gat dat vóór eind september dicht moet zijn.

**Losstaande badge-triggers (Bust, Sharp, Iron Bankroll, ...) nog niet geautomatiseerd.**
Alleen badges die via een missie lopen worden nu automatisch toegekend
(`awardMission` vanuit `lib/missions/engine.ts`). De badges die aan een
losse gebeurtenis hangen (saldo op €0 → Bust, winrate-drempel → Sharp, etc.)
hebben nog geen eigen trigger — voorlopig alleen handmatig toe te kennen via
`/admin/badges`.

**Seed-script v2 fabriceert geen bet-historie.**
Wel geseed: staffel, alle 14 badges, 3 missies, 2 voorbeeld-toekenningen.
Realistische afgeronde bets met correcte odds/uitslagen/saldo-consistentie
namaken kost meer tijd dan het oplevert vergeleken met gewoon de app zelf
gebruiken (via de admin custom-event-flow) om echte bet-historie te
genereren — wat ik ook gedaan heb om de volledige flow te verifiëren (zie
onder).

**Getest: end-to-end tegen de échte Supabase-database, niet een volledige
375px/1440px-pas per pagina.**
Gegeven de omvang van Fase 1 heb ik de kernflows end-to-end geverifieerd met
Playwright tegen het live project (inloggen als speler én als admin via
Supabase's admin-API, geen productie-mail nodig): onboarding, challenge
joinen, admin importeert/maakt een custom event/settelt 'm, speler plaatst
een sportsbook-bet en wordt na settlement uitbetaald (saldo-mutatie
geverifieerd in de database), leaderboard/missies/badges/profiel/pay/
admin-overzichten renderen zonder consolefouten op zowel mobiel (375px) als
desktop (1440px). Geen page-by-page visuele regressiepas over elke losse
admin-subpagina — bij twijfel over een specifieke pagina, vraag het en dan
check ik 'm gericht.

## Fase 0

**Gebruikersnaam max. 24 tekens i.p.v. 20 (expliciete keuze van de opdrachtgever).**
Spec zegt "3–20 tekens"; op 2026-08-22 gevraagd om ruimte voor
`professional_risktaker` (22 tekens). Geen per-gebruiker uitzondering
gemaakt (dat kan niet — de lengte zit in een tabelbrede DB-check-constraint),
in plaats daarvan de limiet voor iedereen verhoogd naar 24. DB-constraint,
Zod-validatie en de onboarding-UI zijn samen aangepast.

**`/auth/confirm` moet zowel PKCE `?code=` als `?token_hash=&type=` links afhandelen.**
Pas ontdekt bij écht testen tegen het live Supabase-project: dit project
gebruikt de PKCE-auth-flow, dus de magic-link e-mail bevat `?code=`, niet het
`token_hash`-formaat dat de route eerst alleen afhandelde — waardoor elke
échte linkklik naar `/login?error=invalid_link` liep. Zie ook
`project_auth_followups` in memory voor de nog openstaande bug rond de
handmatig ingevoerde 6-cijferige code (die blijft falen, ook na deze fix).

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
