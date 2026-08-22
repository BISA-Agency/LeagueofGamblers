# DECISIONS.md

Keuzes die ik onderweg heb gemaakt, met motivatie. Zie PLAN.md §12.7.

## De OTP-code-bug, opgelost (2026-08-22)

Wekenlang stond dit als "magic link werkt, ingetypte code niet, oorzaak
onbekend". De oorzaak bleek banaal: **dit Supabase-project geeft codes van 8
cijfers uit, terwijl het invoerveld `maxLength={6}` had.** De browser kapte
elke code stil af op zes tekens, dus de server kreeg altijd een ongeldige
token en gaf `403 Token has expired or is invalid`. De link werkte omdat
daar niets getypt hoeft te worden — precies het patroon dat het zo
verwarrend maakte.

Niet teruggezet naar 8: de codelengte is een projectinstelling in Supabase
(6–10 tekens). Het veld staat nu op het maximum van 10, zodat het blijft
werken als die instelling ooit wijzigt. De tekst zegt niet langer
"6-cijferige code".

**Wat het opsporen zo lang liet duren, is ook gefixt.** De inlogactie ving de
Supabase-fout op en verving hem door één vriendelijke zin, dus de échte
statuscode en melding waren nergens te zien. Die worden nu server-side
gelogd; de gebruiker ziet nog steeds de vriendelijke melding.

Meegenomen: codes worden uit mailclients geplakt mét spaties of een
streepje, dus niet-cijfers gaan er server-side uit voor verificatie.

## Eerste echte Odds API-run (2026-08-22)

De koppeling was gebouwd op de documentatie en had nog nooit met de echte
API gepraat. Bij de eerste live run kwamen vier dingen boven water.

**Publiceren van een import crashte altijd.** De preview wordt in een
`jsonb`-kolom geparkeerd, dus `startsAt` komt terug als string terwijl
Drizzle een `Date` verwacht (`value.toISOString is not a function`). Dit pad
was nooit end-to-end gelopen: custom events gaan langs een ander pad en de
seed schrijft rechtstreeks. Zonder deze fix had geen enkele echte import
gepubliceerd kunnen worden. `revivePayload()` zet de datums terug.

**`/odds` geeft ook al begonnen wedstrijden terug**, en de import schreef
die weg als `upcoming`. Wedden erop werd server-side al geweigerd, maar het
sportsbook liep vol met dode kaarten. De import filtert nu op
`nu < startsAt <= nu + 8 dagen`, plus events waar geen enkele bookmaker nog
een quotering voor geeft.

**Credits werden verkeerd geteld.** We lazen `x-requests-used` — het
lifetime-totaal van het account — en telden dat óók nog op per sport, dus
het admin-dashboard toonde "18 credits" voor een import die er 4 kostte.
`x-requests-last` geeft de kosten van díé aanroep; dat is wat we nu
optellen. Gemeten: 1 credit per markt per regio, dus 2 sporten × 2 markten
= 4.

**Vijf van de elf hardcoded sportkeys bestonden niet.** `bundesliga1` moest
`bundesliga` zijn, en tennis heeft geen seizoenssleutel: The Odds API
scoopt tennis per toernooi (`tennis_atp_wimbledon`, ...) en die rouleren het
hele jaar. Champions League en Europa League bestáán wel maar staan in
augustus op inactief — die komen in september vanzelf terug.

Daarom kiest de admin nu uit de **live catalogus** (`/sports?all=true`, een
gratis aanroep) in plaats van uit een vaste lijst: 175 competities,
gegroepeerd en ingeklapt, met buiten-seizoen erbij zodat je in augustus al
de Champions League kunt aanvinken. De statische lijst blijft als fallback
voor als er geen `ODDS_API_KEY` is. Een sleutel die de challenge al gebruikt
blijft altijd zichtbaar, anders zou opslaan hem stilletjes uitvinken.

## Fase 2b — Landingspagina (2026-08-22)

**Eerst een demo-toestand, dan pas screenshots.** `scripts/seed-demo-state.ts`
zet veertien dagen bethistorie neer met een vaste seed: uiteenlopende
saldo's, dagsnapshots (zodat de veldgrafiek en sparklines echte curves
tonen), een tijdlijn met chatthreads en een paar badges. Screenshots van een
lege app verkopen niets; dit is ook meteen de snelste manier om zelf een
challenge halverwege te bekijken.

**Twee interactieve blokken in plaats van alleen plaatjes.** De spec vroeg om
screenshots, maar wat overtuigt is zelf iets doen: een speelbare bet slip
(combi bouwen, winst ziet meebewegen, dezelfde regel dat twee selecties uit
één wedstrijd niet kan) en een potcalculator. Die calculator roept de échte
`calculatePrizeSplit` aan, dus het bedrag op de landingspagina kan niet
uiteenlopen met wat de app straks uitkeert.

**Alleen de actieve tab rendert zijn screenshot.** next/image laadt lazy, dus
afbeeldingen in verborgen tabpanelen werden sowieso nooit opgehaald — vijf
telefoonscreenshots eager laden is die milliseconde niet waard. Het frame
houdt een vaste beeldverhouding, zodat wisselen niets verschuift (CLS 0).

**Twee echte bugs die de Lighthouse-run boven water haalde.** De middleware
matcher sloot statische bestanden niet uit: `/robots.txt` werd naar `/login`
geredirect, en — vervelender — de image-optimizer haalde
`/screenshots/*.png` via de app op en kreeg diezelfde login-redirect terug,
waardoor de hero-afbeelding in productie een 400 gaf. De matcher negeert nu
alles met een bestandsextensie. Daarna: performance 90, toegankelijkheid
100, best practices 100, SEO 100.

**Vlaggen zijn SVG's, geen emoji.** Eerst gebouwd met
regional-indicator-emoji, maar Windows toont die bewust als twee letters
(NL) — geen bug, een keuze van Microsoft, maar het oogt kapot naast een
gebruikersnaam. Nu komen de vlaggen uit `public/flags/<code>.svg`.
`country-flag-icons` blijft een devDependency: `npm run flags` kopieert
alleen de ~50 landen die we aanbieden (26 KB totaal) en de SVG's zijn het
artefact dat in de repo staat, dus er is geen runtime-afhankelijkheid.
Bewust een gewone `<img>`: door de image-optimizer routeren kost een
round-trip en levert bij 500 bytes niets op.

**Lighthouse-cijfers zijn van een warme server.** Drie opeenvolgende runs
geven performance 93; de allereerste run na `next start` gaf 87 omdat de
afbeeldingen dan nog on-demand geoptimaliseerd worden. Op Vercel cachet de
edge die varianten na het eerste verzoek, dus dat is een koude-start-
artefact en geen structureel cijfer.

## Feedback-ronde na Fase 2 (2026-08-22)

**Open bets tellen niet als verlies.** Bij plaatsen gaat de inzet van het
saldo af, dus `saldo − startsaldo` liet geld in open bets als verlies zien.
Overal waar W/V getoond wordt (leaderboard, head-to-head, wrapped,
weekwinnaar) wordt de open inzet nu teruggeteld. De ránking blijft op kaal
saldo — dat is de §5.2-regel ("hoogste saldo wint"), en inzetten die nog
kunnen verdampen horen daar niet in mee.

**Missies zijn gesplitst in twee soorten.** Het schema kon dit al
(`challenge_id` null = challenge-loos), maar het onderscheid bestond
nergens. Nu: League of Gamblers-missies zijn carrière-breed, één keer ooit
te behalen en geven alleen XP; challenge-missies horen bij één challenge en
zijn de enige die geld kunnen uitkeren (uit het missiebudget van die
challenge). De completion-check voor LoG-missies kijkt over challenges heen
— voorheen zou "Eerste winst" in elke nieuwe challenge opnieuw uitbetalen.
Tijdgebonden types (profit_day e.d.) kunnen geen LoG-missie zijn: ze lezen
een challenge-saldo.

**Chat zit ín de activity feed, niet ernaast.** Chatberichten zijn
activity_feed-rijen met type `chat`; een `parent_id` (één niveau diep, een
reply op een reply klapt terug naar dezelfde thread) maakt van elk
tijdlijn-item een gespreksstarter. Daardoor kun je direct onder iemands
verloren bet reageren — het gevraagde "elkaars bets zien en erover praten"
— en werken de bestaande emoji-reacties automatisch ook op chatberichten.
Een aparte chattabel had twee tijdlijnen opgeleverd die naast elkaar
gemerged moesten worden. Reply → in-app-notificatie voor de threadstarter.
Max 280 tekens, max 10 berichten/minuut (in de database geteld).

**Land als ISO-code, vlag als emoji.** Geen vlag-assets: twee regional
indicator-codepoints vormen de vlag, `Intl.DisplayNames` levert de
Nederlandse naam. De lijst is bewust gecureerd (~50 landen) — een dropdown
met 250 landen maakt het normale geval slechter; uitbreiden is één code in
`lib/countries.ts`.

**Bookmaker weg uit het bewijsbet-formulier.** Op verzoek — de screenshot
toont de bookmaker toch al. Kolom blijft bestaan voor oude rijen.

## Fase 1 — gaten dichten (na Fase 2)

**Challenge afsluiten is een admin-actie, geen cron.**
`settling→finished` schrijft `payout_prize`-records: echt geld. Dat wil je
niet 's nachts automatisch laten gebeuren terwijl er misschien nog een bet
open staat. De actie weigert dan ook zolang er open bets zijn, want de
eindstand kan dan nog schuiven. De records komen op `pending` binnen; ze
afvinken blijft een aparte stap, net als bij missie-uitkeringen.

**Iron Bankroll wordt beoordeeld op dagsnapshots, niet op een echte
low-water mark.** We houden geen saldo-grootboek bij, dus een dip die
binnen dezelfde dag hersteld werd zien we niet. Bewust: een badge is geen
boekhouding, en een grootboek toevoegen alleen hiervoor is niet de moeite.

**`user_badges` had geen unique constraint.** Alle `onConflictDoNothing()`
in de toekenningspaden waren daardoor no-ops — dezelfde badge kon meerdere
keren toegekend worden. Migratie 0008 ruimt eventuele duplicaten op en zet
de constraint erop (`NULLS NOT DISTINCT`, zodat challenge-loze badges ook
maar één keer kunnen).

**Rate limiting telt in de database.** Elke request kan op een andere
serverless-instance landen, dus een teller in het geheugen handhaaft niets.
Het echte risico is geen aanvaller maar een dubbele tap op een trage
verbinding; vandaar een burst-venster van 3 seconden plus een cap van 12
per minuut.

**Voortgangsbalken alleen voor telbare missies.** `win_streak`, `sport_win`,
`balance_reach` en `volume` hebben een zinnige tussenstand. De rest is
pass/fail — een balk die op 0% blijft staan tot hij naar 100% springt zegt
minder dan geen balk.

**Selecthoogte zat vast op 32px.** shadcn's `SelectTrigger` schrijft zijn
hoogte als `data-[size=default]:h-8`. tailwind-merge ziet dat niet als
conflict met een gewone `h-11`, dus per-instance overrides verloren het
stilletjes. Nu staat de hoogte in het component zelf, op 44px.

**Overgebleven "kleine tap-targets" in de responsive-pas zijn geen bugs.**
Wat de audit nog meldt zijn inline tekstlinks (inhoudsopgave op /rules, het
woordmerk, "Mijn bets") en Radix' verborgen 1px native `<select>` voor
form-integratie. Die horen niet op 44px.

## Fase 2

**Notificaties: drie types, geen `bet_settled`.**
De spec vraagt expliciet om de dagelijkse rank-update (§5.9). Daarnaast
sturen we `mission_completed` en `new_follower`. Een notificatie per
afgerekende bet is bewust weggelaten: elke afrekening staat al in de
activity feed, en met een weekendje voetbal zou de bel puur ruis worden.
Kan later alsnog, het type-veld is gewoon `text`.

**Rank-update wordt in de snapshot-cron gemaakt, niet in een eigen cron.**
`runDailyRankSnapshots` berekent de ranking toch al; een tweede cron zou
diezelfde sortering moeten herhalen en kan uit de pas lopen. De snapshot-
upsert is idempotent maar notificaties zijn dat niet, dus er zit een
expliciete guard in: draait de cron twee keer op dezelfde dag, dan krijgt
niemand een tweede rank-update.

**E-mailnotificaties (Resend) nog niet gebouwd.**
De spec noemt ze "optioneel". In-app is er nu; e-mail vraagt om een
opt-out-instelling per speler, anders is het bij een challenge van een maand
gegarandeerd irritant. Dat is een aparte feature, geen bijproduct.

**De ongelezen-teller staat in de `(authenticated)` layout.**
Daardoor moet elke actie die notificaties leest/aanmaakt met
`revalidatePath("/app", "layout")` invalideren — een page-scoped revalidate
laat de badge op een verouderde stand staan. Dat is in de praktijk
misgegaan bij "alles gelezen" en daarna gefixt.

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
