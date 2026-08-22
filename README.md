# League of Gamblers

Maandelijkse virtuele sportsbetting-challenge voor vriendengroepen. Zie
[PLAN.md](./PLAN.md) voor de fasering en [DECISIONS.md](./DECISIONS.md) voor
gemaakte keuzes onderweg.

**Status:** Fase 0 (fundament) — zie de checklist in PLAN.md.

## Stack

Next.js 16 (App Router) · TypeScript · Tailwind CSS + shadcn/ui · Supabase
(Postgres, Auth, Storage) · Drizzle ORM · Zod.

## Setup

### 1. Dependencies

```bash
npm install
```

### 2. Supabase-project

1. Maak een project aan op [supabase.com](https://supabase.com) (gratis tier).
2. Ga naar **Settings → API** en kopieer de Project URL, de `anon` key en de
   `service_role` key.
3. Ga naar **Settings → Database → Connection string**, kies **Transaction**
   pooler (poort 6543), en kopieer de connection string.

### 3. Environment variables

```bash
cp .env.example .env.local
```

Vul `.env.local` in met de waarden uit stap 2. `ADMIN_EMAILS` is een
komma-gescheiden lijst van e-mailadressen die adminrechten krijgen (zie
`src/lib/auth/admin.ts`).

### 4. Database-migraties

```bash
npm run db:migrate
```

Dit voert `drizzle/migrations/` uit tegen je Supabase-database, inclusief het
aanzetten van de `citext`-extensie (nodig voor case-insensitieve
gebruikersnamen). Na een schemawijziging: `npm run db:generate` om een nieuwe
migratie te genereren, dan opnieuw `npm run db:migrate`.

> Genereer nooit migraties zonder ze te reviewen — `drizzle/schema/_auth.ts`
> verwijst naar Supabase's eigen `auth.users`-tabel puur voor
> foreign-key-typering; die tabel mag nooit door onze migraties worden
> aangemaakt (zie het commentaar bovenin `drizzle/migrations/0000_*.sql`).

### 5. RLS- en Storage-policies

```bash
npm run db:apply-sql supabase/migrations/0001_rls_policies.sql
npm run db:apply-sql supabase/migrations/0002_storage_policies.sql
```

Deze zijn niet Drizzle-managed (Drizzle's schema-DSL kent geen RLS-policies)
en moeten dus los uitgevoerd worden. De twee Storage buckets zelf
(`avatars`, publiek; `proof-bet-screenshots`, privé — screenshots worden
alleen als kortlevende signed URL vrijgegeven na een server-side check,
zie `src/lib/storage/`) staan al klaar in het project.

### 6. Seed-data (optioneel, voor lokaal testen)

```bash
npm run db:seed
```

Maakt een demo-challenge (`/c/demo`) met 8 demo-spelers aan (6 met
`inleg betaald`, 2 zonder), via `demo.<naam>@league-of-gamblers.test`-adressen
die met Supabase's admin-API worden aangemaakt (vereist
`SUPABASE_SERVICE_ROLE_KEY`). Roept nooit The Odds API aan.

### 7. Dev server

```bash
npm run dev
```

→ [http://localhost:3000](http://localhost:3000)

## Icons regenereren

Na een wijziging aan `public/icon.svg`:

```bash
npm run icons:generate
```

## Cron (Vercel)

`vercel.json` registreert drie cron-routes, beveiligd met `CRON_SECRET`
(zet die env var in je Vercel-project — Vercel stuurt 'm dan automatisch mee
als `Authorization: Bearer ...` header, precies wat de routes verwachten):

- `/api/cron/status-transitions` — elk uur: challenges open→live/live→settling
  op datum.
- `/api/cron/results` — dagelijks 06:00 UTC: uitslagen ophalen + auto-settlen.
- `/api/cron/odds-import` — wekelijks maandag 08:00 UTC (≈ 10:00
  Europe/Amsterdam in de zomer, 09:00 in de winter — Vercel cron kent geen
  tijdzones, dus dit verschuift 1 uur rond de klokwissel).

Lokaal testen zonder Vercel: `curl -H "Authorization: Bearer $CRON_SECRET" http://localhost:3000/api/cron/status-transitions`.

Nog niet gebouwd: een cron voor tijdgebonden missies (`profit_day`,
`survive`, ...) — die missietypes zijn pas Fase 2-scope, dus die route zou nu
niets te doen hebben.

## Testen

- `npm run lint`
- `npm run build` (compileert + type-checkt)
- Test elke pagina op 375px (mobiel) en 1440px (desktop) breedte voor je een
  wijziging als klaar beschouwt.
