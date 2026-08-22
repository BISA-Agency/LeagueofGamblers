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

### 5. Storage buckets (nog niet gebruikt in Fase 0)

Vanaf Fase 1 zijn er twee Storage buckets nodig (aan te maken via
**Storage** in het Supabase dashboard, met RLS-policies die spelers alleen
toegang geven tot hun eigen bestanden):

- `avatars` — publiek leesbaar, alleen de eigenaar mag schrijven.
- `proof-bet-screenshots` — pas leesbaar voor medespelers na aanvang van het
  event (zie §7 van PLAN.md); alleen de eigenaar mag schrijven.

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

## Later (Fase 1+)

- `ODDS_API_KEY` — The Odds API, gratis tier (500 credits/maand). Nog niet
  gebruikt.
- `CRON_SECRET` — beveiligt de `/api/cron/*` routes zodra die bestaan.
- Vercel-deploy + Vercel Cron voor de wekelijkse odds-import, dagelijkse
  uitslagen en snapshots — nog niet ingericht.

## Testen

- `npm run lint`
- `npm run build` (compileert + type-checkt)
- Test elke pagina op 375px (mobiel) en 1440px (desktop) breedte voor je een
  wijziging als klaar beschouwt.
