# PLAN.md — League of Gamblers

Dit plan is de eerste stap volgens §12.1 van de build-prompt: fases, checklist per fase en voorgestelde mappenstructuur. **Er wordt pas gebouwd na akkoord op dit plan.**

Doel-datum: eerste challenge live op **1 september 2026** → Fase 0 + Fase 1 (MVP) moeten daarvóór klaar zijn. Dat is krap, dus MVP-scope is strak gehouden aan §11.

---

## 1. Voorgestelde mappenstructuur

```
league-of-gamblers/
├── .env.example
├── README.md
├── PLAN.md
├── DECISIONS.md
├── package.json
├── next.config.ts
├── tailwind.config.ts
├── drizzle.config.ts
├── middleware.ts                      # auth refresh + /admin guard
├── public/
│   ├── manifest.json                  # PWA manifest, LoG icons
│   ├── icons/
│   └── screenshots/                   # gegenereerd door scripts/screenshots.ts
├── content/
│   └── landing.ts                     # NL-copy landingspagina
├── drizzle/
│   ├── schema/                        # één bestand per domein (zie §7 spec)
│   │   ├── profiles.ts  challenges.ts  prize-tiers.ts  participants.ts
│   │   ├── events.ts  markets.ts  outcomes.ts  odds-imports.ts
│   │   ├── bets.ts  bet-selections.ts  bet-flags.ts  sanctions.ts
│   │   ├── missions.ts  badges.ts  xp.ts  payments.ts
│   │   ├── rank-snapshots.ts  activity-feed.ts  follows.ts
│   │   ├── notifications.ts  predictions.ts  audit-log.ts
│   │   └── index.ts
│   └── migrations/                    # gegenereerd door drizzle-kit
├── scripts/
│   ├── seed.ts                        # demo-challenge + demo-data
│   └── screenshots.ts                 # Playwright, voor landingspagina
├── src/
│   ├── app/
│   │   ├── (public)/
│   │   │   ├── page.tsx               # "/" landingspagina
│   │   │   ├── rules/page.tsx         # "/rules"
│   │   │   ├── c/[slug]/page.tsx      # publieke challenge-pagina
│   │   │   └── login/page.tsx
│   │   ├── (app)/                     # ingelogd, met bottom-nav/sidebar shell
│   │   │   ├── layout.tsx
│   │   │   ├── onboarding/page.tsx
│   │   │   ├── app/
│   │   │   │   ├── page.tsx                       # home
│   │   │   │   ├── challenges/page.tsx
│   │   │   │   ├── sportsbook/page.tsx
│   │   │   │   ├── bets/page.tsx
│   │   │   │   ├── bets/proof/page.tsx
│   │   │   │   ├── leaderboard/page.tsx
│   │   │   │   ├── missions/page.tsx
│   │   │   │   ├── profile/[username]/page.tsx
│   │   │   │   ├── profile/edit/page.tsx
│   │   │   │   ├── compare/page.tsx
│   │   │   │   ├── challenge/[slug]/page.tsx
│   │   │   │   ├── pay/page.tsx
│   │   │   │   └── notifications/page.tsx
│   │   │   └── wrapped/[challengeId]/[username]/page.tsx
│   │   ├── admin/
│   │   │   ├── layout.tsx             # ADMIN_EMAILS guard
│   │   │   ├── page.tsx               # dashboard
│   │   │   ├── challenges/  sportsbook/  proof-bets/  players/
│   │   │   ├── bets/  missions/  badges/  payments/
│   │   │   ├── prize-tiers/  audit-log/
│   │   ├── api/
│   │   │   ├── og/...                 # OG image routes
│   │   │   └── cron/
│   │   │       ├── odds-import/route.ts
│   │   │       ├── results/route.ts
│   │   │       ├── snapshots/route.ts
│   │   │       ├── status-transitions/route.ts
│   │   │       └── missions/route.ts
│   │   ├── layout.tsx
│   │   └── globals.css
│   ├── components/
│   │   ├── ui/                        # shadcn primitives
│   │   ├── nav/                       # bottom-nav (mobiel), sidebar (desktop)
│   │   ├── betslip/                   # bottom sheet / vast paneel
│   │   ├── sportsbook/  leaderboard/  missions/  badges/  profile/  charts/
│   ├── lib/
│   │   ├── supabase/                  # client.ts, server.ts, middleware.ts
│   │   ├── db/index.ts                # drizzle client
│   │   ├── odds-provider/
│   │   │   ├── types.ts               # OddsProvider interface
│   │   │   ├── the-odds-api.ts
│   │   │   └── manual.ts
│   │   ├── payment-provider/
│   │   │   ├── types.ts               # PaymentProvider interface
│   │   │   └── cash.ts
│   │   ├── missions/
│   │   │   ├── engine.ts              # generieke evaluator + registry
│   │   │   └── types/*.ts             # één module per mission-type
│   │   ├── settlement/
│   │   │   ├── markets.ts             # h2h/totals/spreads afrekenlogica
│   │   │   └── payouts.ts             # prize-tier berekening
│   │   ├── auth/admin.ts              # isAdmin(email)
│   │   ├── validation/                # zod schemas per domein
│   │   ├── audit.ts
│   │   └── utils.ts
│   ├── actions/                       # server actions per domein
│   │   ├── bets.ts  proof-bets.ts  challenges.ts  admin.ts  missions.ts  profile.ts
│   └── styles/theme.ts                # accentkleur-tokens (lime/gold)
└── supabase/
    ├── migrations/                    # RLS policies + storage buckets (SQL)
    └── config.toml
```

**Rationale kort:**
- `(public)` en `(app)` als route groups zodat de authenticated shell (bottom nav / sidebar / bet slip) niet op de landingspagina staat.
- `lib/odds-provider` en `lib/payment-provider` zijn de twee interfaces uit de spec (§5.3, §6) — Fase 3-implementaties (live odds, crypto) komen er later naast zonder de rest te raken.
- `lib/missions/engine.ts` is een generieke evaluator die door `type` + `params jsonb` itereert over mission-modules in `lib/missions/types/`, zodat nieuwe missietypes een nieuw bestand zijn, geen nieuwe `if`-tak.
- Alle geldstromen (pot, missies, prijzen) lopen door `payments`-tabel en `settlement/payouts.ts`, nergens los berekend in UI-componenten.

---

## 2. Fase 0 — Fundament (dag 1–2)

- [x] Next.js scaffolden (App Router, TypeScript strict, Tailwind, ESLint) — 16.3.2 i.p.v. 15, zie DECISIONS.md
- [x] shadcn/ui installeren + basis-componenten (button, input, card, sheet, dialog, tabs, badge, avatar, skeleton, ...)
- [x] Design tokens: dark theme (enige thema), accentkleur als theme-token met **twee varianten (lime/goud)** wisselbaar via `NEXT_PUBLIC_ACCENT_THEME`, profit/loss-tokens, Geist font, globale `tabular-nums`
- [x] Git repo initialiseren, eerste commits, `.gitignore`
- [x] Drizzle config + eerste migratie-pipeline werkend (schema + migratie klaar; nog niet uitgevoerd tegen een echte Supabase-database — dat kan pas met jouw projectgegevens)
- [x] `profiles` schema + Supabase Auth (magic link/OTP) + middleware voor sessie-refresh
- [x] Onboarding-flow: gebruikersnaam (citext uniek, regex), gegenereerde avatar (echte upload volgt in Fase 1), favoriete club/sport, regels-checkbox → `rules_accepted_at`
- [x] `/rules`-pagina, v1-tekst (NL)
- [x] Navigatie: bottom nav (mobiel, 5 items) + sidebar (desktop), responsive shell
- [x] `challenges` + `challenge_participants` schema, admin CRUD (minimaal), open-challenges lijst + joinen
- [x] PWA manifest + LoG favicon/icons
- [x] Seed-script v1 (profiles + challenge + participants) — nog niet uitgevoerd, vereist een echt Supabase-project
- [x] `.env.example`, README met Supabase/cron setup-stappen
- [~] Getest op 375px en 1440px — publieke pagina's (landing, regels, login) geverifieerd met Playwright-screenshots, build + lint groen. Pagina's achter login/DB (onboarding, app/*, admin/*) kon ik nog niet visueel testen zonder een echt Supabase-project — zie bericht.

## 3. Fase 1 — MVP (klaar vóór 1 september 2026)

**Challenges & pot**
- [x] Admin CRUD: statussen (open→live/live→settling auto via cron + handmatige override in de UI), sport/markt-selectie. Nog niet gebouwd: `draft→open` blijft puur handmatig (bewust, geen datumtrigger nodig), missiebudget-veld en rebuy-toggle hebben nog geen UI (kolommen bestaan al in het schema)
- [x] `prize_tiers` tabel + beheer-UI, live potberekening en -weergave op de publieke challenge-pagina
- [x] "Inleg betaald"-toggle per speler (admin); banner voor onbetaalde spelers en "alleen betaalde spelers tellen mee" **nog niet overal doorgevoerd** (leaderboard filtert al op `paidBuyIn`, maar er is nog geen zichtbare banner op de speler-kant)
- [ ] Challenge-switcher (meerdere challenges tegelijk) — elke pagina pakt nu impliciet "de" actieve challenge van de speler; met >1 gelijktijdige challenge per speler is dit nog niet getest of gebouwd

**Sportsbook**
- [x] `OddsProvider`-interface + `TheOddsApiProvider` (eu-regio, credits-tracking uit response headers, `/events` voor gratis listing + `/odds` voor de daadwerkelijke import) + aggregatie-strategie (hoogste/gemiddelde/referentie) via env var
- [x] `ManualProvider` voor admin custom events
- [x] `events` / `markets` / `outcomes` / `odds_imports` schema, met een unique-constraint op `(challenge_id, external_id)` zodat een herimport upsert i.p.v. dupliceert
- [x] Wekelijkse import-flow: cron (maandag 08:00 UTC, zie `vercel.json`) + handmatige knop, preview-scherm (diff, credits), publiceren, auto-publish toggle per challenge
- [x] Sportsbook-UI: events per sport, odds-knoppen, bet slip (bottom sheet mobiel / vast paneel desktop), combi's (geen zelfde-event combinaties), 10/25/50/all-in sneltoetsen
- [x] Odds vastleggen bij plaatsen (nooit meer wijzigen — herimport laat bestaande `bet_selections` ongemoeid), event sluit server-side op `starts_at`
- [x] Admin: event schorsen/heropenen/void, custom events toevoegen + settlement-queue. Markt-niveau schorsen (i.p.v. het hele event) is niet apart gebouwd — event-schorsen blokkeert al het plaatsen van nieuwe bets op dat event, wat voor Fase 1 volstaat
- [x] Automatische settlement via `getResults()` (h2h/totals/spreads, incl. Asian-handicap kwartlijnen → half_won/half_lost) + handmatige settlement-queue voor custom events
- [ ] Bets verborgen voor medespelers tot `event_start` — RLS-policy staat er (defensief), maar er is nog geen "bekijk bets van andere spelers"-scherm gebouwd waarin dit daadwerkelijk getoond/getest wordt

**Bewijsbet**
- [x] `/app/bets/proof` formulier (dynamische selecties voor combi's) + uitklapbare uitleg (tekstueel; geen geannoteerde voorbeeldafbeelding — die zou een los gemaakt asset vereisen)
- [x] Screenshot-upload naar Supabase Storage (privé bucket, max 5MB, jpg/png/webp/heic), verplicht, alleen als signed URL server-side vrijgegeven na autorisatie-check
- [x] Server-side: `placed_at < event_start` check, stake ≤ balance
- [x] Controle-queue admin (screenshot groot, goedkeuren/afkeuren + reden, sanctie: waarschuwing/saldo-correctie/diskwalificatie)
- [x] Flag-systeem (actie bestaat, `bet_flags`-tabel + RLS) — er is nog geen speler-UI om een flag *in te dienen* op een bet
- [x] Zelf-settlement door speler (won/lost/void). "Betwistbaar" = dezelfde flag-actie; nog geen aparte betwist-UI

**Fairness & audit**
- [x] `audit_log` + helper (`lib/audit.ts`), aangeroepen vanuit de admin-mutaties die tot nu toe gebouwd zijn (import publiceren, custom events, bewijsbet-controle, sancties, betalingen, missies/badges toekennen)
- [x] RLS policies op alle 19 tabellen + Storage — zie §7-notitie in DECISIONS.md over hoe dit zich verhoudt tot de geprivilegieerde Drizzle-verbinding die de app zelf gebruikt
- [ ] Rate limiting op bet-plaatsing — nog niet gebouwd

**Leaderboard, profiel, gamification-basis**
- [x] Leaderboard met de kolommen uit §5.5 min. de trend-pijl (die heeft `rank_snapshots` nodig, Fase 2-scope) — 30s polling i.p.v. Supabase Realtime-subscriptions
- [x] Profiel: badges-vitrine, XP/level, sancties-telling, saldo/winrate voor de actieve challenge. Uitgebreidere stats (streaks, gem. odds, enkel/combi-verhouding, etc.) nog niet gebouwd
- [x] Missie-engine (`lib/missions/engine.ts`, registry-patroon) + types `win_odds_min`, `win_streak`, `combi_win`; `manual` bewust zonder auto-checker
- [x] Badges: seed-set (§5.8, alle 14) + handmatige toekenning + automatische toekenning via missies. Losstaande badge-triggers (bijv. "Bust" bij saldo €0, "Sharp" bij winrate-drempel) zijn nog niet los geautomatiseerd — alleen wat via een missie loopt wordt nu toegekend
- [x] `/app/missions` — toont behaald/niet-behaald en wie 'm al heeft; geen proportionele voortgangsbalk (zou een aparte progress-functie per missietype vereisen)

**Betalingen (fase 1 = alleen administratie)**
- [x] `payments`-tabel + `PaymentProvider`-interface + `CashProvider`
- [x] `/app/pay` inleg-info (cash), admin "te betalen"-lijst voor missie-uitkeringen. Prijsuitbetaling-aan-het-einde (met automatische `payments`-records bij `settling→finished`) is **nog niet gebouwd** — die transitie zelf ontbreekt nog

**Admin dashboard**
- [x] Overzicht: challenge-statussen, bewijsbetten in wachtrij, open flags, te betalen bedragen, laatste import + resterende credits

**Cron**
- [x] `/api/cron/odds-import`, `/results`, `/status-transitions` — beveiligd met `CRON_SECRET`, `vercel.json` aangemaakt. `/api/cron/missions` (tijdgebonden missietypes) bewust nog niet gebouwd — die missietypes zijn Fase 2-scope. `/snapshots` is Fase 2 (`rank_snapshots`-tabel bestaat nog niet)

**Seed & QA**
- [x] Seed-script v2: 8 demo-spelers, staffel, alle 14 badges, 3 missies, 2 voorbeeld-toekenningen. Geen gefabriceerde bet-historie (zie DECISIONS.md voor de afweging)
- [~] Getest: geen volledige 375px/1440px-pas over élke pagina, wel end-to-end tegen de echte database geverifieerd (inloggen, onboarding, challenge joinen, admin importeren/custom event/settlen, sportsbook-bet plaatsen → uitbetalen, leaderboard, missies, badges, profiel, pay, admin-overzichten) — zie DECISIONS.md

## 4. Fase 2 — Tijdens de eerste challenge

- [x] XP & levels (Rookie→Punter→Grinder→Sharp→Whale→Legend), level-progressbar — level wordt afgeleid uit `xp` (`lib/levels.ts`), niet opgeslagen; balk staat op profiel + desktop-sidebar
- [x] Activity feed + emoji-reacties op homepage
- [x] `rank_snapshots` cron + sparkline per speler + veldgrafiek (recharts) op challenge-pagina — cron draait 22:05 UTC (≈ 00:05 Amsterdam, zie DST-kanttekening in DECISIONS.md)
- [ ] Head-to-head (`/app/compare`)
- [x] Notificaties (in-app): dagelijkse rank-update via de snapshot-cron, plus `mission_completed` en `new_follower`; bel met ongelezen-teller in de header, `/app/notifications`. Resend-e-mail bewust nog niet (zie DECISIONS.md)
- [ ] "Bet van de dag"-highlight
- [ ] Weekmissies + weekwinnaar mini-ranking
- [ ] Voorspelling side-game bij challenge-start
- [x] Overige missietypes: `profit_day`, `profit_week`, `volume`, `sport_win`, `survive`, `balance_reach`, `underdog`, `all_in_win` — tijdgebonden types via `/api/cron/missions`, rest via de per-bet engine
- [ ] Wrapped-pagina (`/wrapped/[challengeId]/[username]`)
- [ ] Deelbare OG-kaarten (`/api/og/*`): leaderboard, profiel, "ik won"
- [x] Midweek-import toggle (optioneel, default uit) — `?midweek=1` op de bestaande import-cron, donderdag
- [x] `follows`-tabel + volgen-knop op profiel, inclusief volgers/volgend-teller en een notificatie voor de gevolgde speler

## 5. Fase 2b — Landingspagina (einde project)

- [ ] `content/landing.ts` met alle NL-copy
- [ ] Secties 1–9 uit §10 bouwen (hero, hoe-het-werkt, features met screenshots, sportsbook vs. bewijsbet, potverdeling, missies/badges, fair play, FAQ, CTA/footer)
- [ ] `scripts/screenshots.ts` (Playwright) tegen geseede demo-data, mobiel (390px) + desktop → `/public/screenshots/`
- [ ] ISR/statisch, OG-tags, Lighthouse ≥ 90 mobiel

## 6. Fase 3 — Later (alleen ontwerpen nu, niet bouwen)

- [ ] `OddsProvider` uitbreidbaar naar frequentere/live odds zonder refactor
- [ ] `CryptoProvider` (USDT/USDC op Polygon/Tron), wallet-adres + QR op `/app/pay`, tx-hash verificatie via publieke explorer/RPC — nooit private keys in de app
- [ ] Staffels voor 16+ spelers
- [ ] Multi-tenant light (meerdere leagues, eigen admins)

---

## 7. Openstaande beslissingen die al beantwoord zijn in de spec (worden vastgelegd in DECISIONS.md tijdens het bouwen)

Deze staan in §13 en zijn al als "bouw het als instelling met default X" beantwoord — geen blokkade, alleen ter bevestiging dat ze zo worden geïmplementeerd:

- Accentkleur: theme-token, beide varianten (lime/goud) beschikbaar, jij kiest later welke standaard is.
- Odds-aggregatie per markt: instelling, default "hoogste".
- Auto-publish import: toggle, default uit (altijd preview eerst).
- Midweek-import: toggle, default uit.
- Rebuy: instelling per challenge, default uit.

Geen van deze blokkeert de start van Fase 0.

## 8. Wat ik nodig heb van jou vóór Fase 1 kan draaien (niet blokkerend voor Fase 0)

- Supabase project (URL + anon/service keys)
- `ODDS_API_KEY` (The Odds API, gratis tier)
- `ADMIN_EMAILS`
- Vercel project (voor cron secrets/env)

Fase 0 (scaffold, design system, auth-plumbing, onboarding, seed v1) kan grotendeels zonder deze al starten met lokale/placeholder env-waarden.

---

**Volgende stap:** na jouw akkoord op dit plan begin ik met Fase 0, in kleine commits per feature, en start ik `DECISIONS.md` voor nieuwe keuzes die ik onderweg maak.
