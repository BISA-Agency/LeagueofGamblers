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

- [ ] Next.js 15 project scaffolden (App Router, TypeScript strict, Tailwind, ESLint)
- [ ] shadcn/ui installeren + basis-componenten (button, input, card, sheet, dialog, tabs, badge, avatar, skeleton)
- [ ] Design tokens: dark theme (zinc-950/neutral-950), accentkleur als theme-token met **twee varianten (lime/goud)** wisselbaar via config, rood voor verlies, Geist/Inter font, `tabular-nums` utility
- [ ] Git repo initialiseren, eerste commit, `.gitignore`
- [ ] Supabase project koppelen (env vars), Drizzle config + eerste migratie-pipeline werkend
- [ ] `profiles` schema + Supabase Auth (magic link/OTP) + middleware voor sessie-refresh
- [ ] Onboarding-flow: gebruikersnaam (citext uniek, regex, niet wijzigbaar tijdens lopende challenge), avatar (upload of gegenereerd), favoriete club/sport, regels-checkbox → `rules_accepted_at`
- [ ] `/rules`-pagina, v1-tekst (NL, wordt later aangevuld naarmate features klaar zijn)
- [ ] Navigatie: bottom nav (mobiel, 5 items) + sidebar (desktop), responsive shell in `(app)/layout.tsx`
- [ ] `challenges` + `challenge_participants` schema, admin CRUD (minimaal), open-challenges lijst + joinen
- [ ] PWA manifest + LoG favicon/icons
- [ ] Seed-script v1 (profiles + challenge + participants, uitgebreid per volgende fases)
- [ ] `.env.example`, README met Supabase/Vercel/cron setup-stappen
- [ ] Getest op 375px en 1440px

## 3. Fase 1 — MVP (klaar vóór 1 september 2026)

**Challenges & pot**
- [ ] Admin CRUD volledig: statussen (`draft→open→live→settling→finished`, auto via cron + handmatige override), sport/markt-selectie, missiebudget, rebuy-toggle
- [ ] `prize_tiers` tabel + beheer-UI, live potberekening en -weergave op challenge-pagina
- [ ] "Inleg betaald"-toggle per speler (admin), banner voor onbetaalde spelers, alleen betaalde spelers op leaderboard/pot
- [ ] Challenge-switcher (meerdere challenges tegelijk)

**Sportsbook**
- [ ] `OddsProvider`-interface + `TheOddsApiProvider` (EU-regio, credits-tracking uit response headers)
- [ ] `ManualProvider` voor admin custom events
- [ ] `events` / `markets` / `outcomes` / `odds_imports` schema
- [ ] Wekelijkse import-flow: cron (ma 10:00 Europe/Amsterdam) + handmatige knop, preview-scherm (diff, credits-schatting), publiceren, auto-publish toggle
- [ ] Sportsbook-UI: events per sport/dag, odds-knoppen, bet slip (bottom sheet mobiel / vast paneel desktop), combi's (geen zelfde-event combinaties), 10/25/50/all-in sneltoetsen
- [ ] Odds vastleggen bij plaatsen (nooit meer wijzigen), event sluit server-side op `starts_at`
- [ ] Admin: event/markt schorsen of void, custom events toevoegen/bewerken/settelen
- [ ] Automatische settlement via `getResults()` (h2h/totals/spreads) + handmatige settlement-queue
- [ ] Bets verborgen voor medespelers tot `event_start` (RLS + UI)

**Bewijsbet**
- [ ] `/app/bets/proof` formulier + uitklapbare uitleg met voorbeeldscreenshot
- [ ] Screenshot-upload naar Supabase Storage (max 5MB, jpg/png/webp/heic), verplicht
- [ ] Server-side: `placed_at < event_start` check, stake ≤ balance
- [ ] Controle-queue admin (screenshot groot, goedkeuren/afkeuren + reden, sanctie: waarschuwing/saldo-correctie/diskwalificatie)
- [ ] Flag-systeem voor medespelers
- [ ] Zelf-settlement door speler (won/lost/void), betwistbaar, admin overrule

**Fairness & audit**
- [ ] `audit_log` + helper (`lib/audit.ts`) aangeroepen vanuit elke admin-mutatie en elke bet-override
- [ ] RLS policies: eigen data schrijven, challenge-scoped lezen, bets/screenshots pas leesbaar na `event_start`, admin via service role
- [ ] Rate limiting (technisch, ~30 req/min) op bet-plaatsing endpoints

**Leaderboard, profiel, gamification-basis**
- [ ] Leaderboard met kolommen uit §5.5, Supabase Realtime + polling-fallback, sticky eigen rij op mobiel
- [ ] Profiel basis: stats (ROI, P/L, winrate, streaks, etc.), bet-historie, sancties zichtbaar
- [ ] Missie-engine (`lib/missions/engine.ts`) + types: `win_odds_min`, `win_streak`, `combi_win`, `manual`
- [ ] Badges: seed-set (§5.8) + toekenningslogica bij settlement/challenge-einde
- [ ] `/app/missions` met voortgangsbalk

**Betalingen (fase 1 = alleen administratie)**
- [ ] `payments`-tabel + `PaymentProvider`-interface + `CashProvider`
- [ ] `/app/pay` inleg-info (cash), admin "te betalen"-lijst voor missies/prijzen

**Admin dashboard**
- [ ] Overzicht: pending controles, flags, te settelen custom events, te betalen missies, resterende credits, recente activiteit

**Cron**
- [ ] `/api/cron/odds-import`, `/results`, `/snapshots`, `/status-transitions` — alle beveiligd met `CRON_SECRET`, Vercel Cron config

**Seed & QA**
- [ ] Seed-script v2: 8 demo-spelers (6 betaald/2 onbetaald), demo-events met odds (geen echte API-call), mix open/gesettelde sportsbook- en bewijsbets, 3 missies, toegekende badges
- [ ] Handmatige test-pass op 375px en 1440px voor elke pagina uit §9 (app-gedeelte)

## 4. Fase 2 — Tijdens de eerste challenge

- [ ] XP & levels (Rookie→Punter→Grinder→Sharp→Whale→Legend), level-progressbar
- [ ] Activity feed + emoji-reacties op homepage
- [ ] `rank_snapshots` cron (00:05) + sparkline per speler + veldgrafiek (recharts) op challenge-pagina
- [ ] Head-to-head (`/app/compare`)
- [ ] Notificaties (in-app + optioneel Resend e-mail): dagelijkse rank-update
- [ ] "Bet van de dag"-highlight
- [ ] Weekmissies + weekwinnaar mini-ranking
- [ ] Voorspelling side-game bij challenge-start
- [ ] Overige missietypes: `profit_day`, `profit_week`, `volume`, `sport_win`, `survive`, `balance_reach`, `underdog`, `all_in_win`
- [ ] Wrapped-pagina (`/wrapped/[challengeId]/[username]`)
- [ ] Deelbare OG-kaarten (`/api/og/*`): leaderboard, profiel, "ik won"
- [ ] Midweek-import toggle (optioneel, default uit)
- [ ] `follows`-tabel + volgen-knop op profiel

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
