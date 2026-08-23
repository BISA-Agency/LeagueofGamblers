// All landing-page copy in one place (§10) — so the wording can be tweaked
// without touching layout, and so there's a single file to proofread.

export const hero = {
  eyebrow: "De maandelijkse onderlinge competitie",
  title: "€10.000 virtueel.\nEén maand.\nHoogste saldo wint de pot.",
  subtitle:
    "Zet je vriendengroep tegen elkaar op in een maand vol bets, trash talk en één winnaar. Je wedt met virtueel saldo; de pot is echt.",
  primaryCta: "Gratis account maken",
  secondaryCta: "Ik heb al een account",
  note: "Geen wachtwoord nodig — je logt in met een code per e-mail",
};

export const stats = [
  { value: "€10.000", label: "virtueel startsaldo", hint: "voor iedereen gelijk" },
  { value: "1 maand", label: "per challenge", hint: "elke maand opnieuw" },
  { value: "12%", label: "van het veld in de prijzen", hint: "de winnaar pakt het meest" },
];

export const howItWorks = {
  title: "Zo werkt het",
  subtitle: "Vier stappen van vriendengroep naar competitie.",
  steps: [
    {
      title: "Maak een challenge",
      body: "Kies de startdatum, de inleg en welke competities meedoen. Deel de link met je vrienden.",
    },
    {
      title: "Iedereen legt in",
      body: "Iedereen betaalt zijn inleg in USDT. De app toont het adres en het exacte bedrag; jij keurt goed en de pot groeit mee.",
    },
    {
      title: "Wedden maar",
      body: "Elke week verse odds in het sportsbook. Van de Eredivisie tot de Premier League, met combi's en handicaps.",
    },
    {
      title: "Hoogste saldo wint",
      body: "Aan het einde van de maand telt alleen je eindsaldo. De app rekent de potverdeling voor je uit.",
    },
  ],
};

export const showcase = {
  title: "De hele competitie in één app",
  subtitle: "Gebouwd voor je telefoon, gemaakt om er de hele maand op te zitten.",
  screens: [
    {
      id: "home",
      tab: "Tijdlijn",
      title: "Alles gebeurt in de tijdlijn",
      body: "Gewonnen bets, klappers, bustes en de trash talk eromheen staan door elkaar. Onder elk moment kun je een thread openen en reageren.",
      image: "/screenshots/home-mobile.png",
    },
    {
      id: "sportsbook",
      tab: "Sportsbook",
      title: "Odds die een week vaststaan",
      body: "Elke maandag verse quoteringen uit de echte markt. Tik een wedstrijd aan voor alle markten, bouw je combi en zet in.",
      image: "/screenshots/sportsbook-mobile.png",
    },
    {
      id: "leaderboard",
      tab: "Leaderboard",
      title: "De stand, elke minuut",
      body: "Saldo, ROI, winst, winrate en openstaande bets van iedereen. Precies genoeg informatie om er iets van te vinden.",
      image: "/screenshots/leaderboard-mobile.png",
    },
    {
      id: "challenge",
      tab: "Grafiek",
      title: "Het hele veld in één lijn",
      body: "Wie klom, wie stortte in, en op welke dag het omsloeg. Elke speler krijgt bovendien zijn eigen sparkline.",
      image: "/screenshots/challenge-mobile.png",
    },
    {
      id: "missions",
      tab: "Missies",
      title: "Missies en weekwinnaars",
      body: "Challenge-missies leveren geld op, League of Gamblers-missies leveren XP en levels op. Plus een mini-ranking per week.",
      image: "/screenshots/missions-mobile.png",
    },
  ],
};

export const sportsbook = {
  title: "Het sportsbook",
  subtitle: "Verse odds, elke week. Alles wat je nodig hebt zit in de app.",
  points: [
    {
      title: "De grote competities",
      body: "Eredivisie, Premier League, La Liga, Serie A, Bundesliga en Ligue 1 — inclusief hun tweede divisies.",
    },
    {
      title: "Meer dan alleen 1X2",
      body: "Over/under, handicaps, team totalen en beide teams scoren, met alternatieve lijnen per wedstrijd.",
    },
    {
      title: "Combi's in de bet slip",
      body: "Meerdere selecties in één bet, met de totale quotering en je mogelijke uitbetaling direct in beeld.",
    },
    {
      title: "Vastgelegd bij plaatsen",
      body: "De quotering die je aantikt is de quotering die je krijgt, en de uitslag wordt automatisch afgerekend.",
    },
  ],
};

export const potSection = {
  title: "Wat kun je winnen?",
  subtitle:
    "De pot is de inleg van iedereen die betaald heeft. Schuif aan het aantal spelers en zie hoe de verdeling meegroeit.",
  disclaimerTitle: "Betalen gaat met USDT",
  disclaimer:
    "Je stuurt je inleg naar het adres in de app en meldt de transactie. De organisator vindt hem terug op de blockchain en zet je in de challenge. Prijzengeld gaat naar het adres op je profiel — de app bewaart nooit iemands geld of sleutels.",
};

export const gamification = {
  title: "Meer dan alleen de stand",
  subtitle: "Een maand is lang. Er valt onderweg genoeg te halen.",
  items: [
    {
      title: "Missies",
      body: "Van 'win een bet boven 20.00' tot 'blijf een week boven de helft van je startsaldo'. Challenge-missies keren geld uit, LoG-missies geven XP.",
    },
    {
      title: "Badges",
      body: "Veertien badges om te verzamelen — Longshot, Hot Streak, Iron Bankroll, Comeback en de gevreesde Bust.",
    },
    {
      title: "Levels & XP",
      body: "Van Rookie naar Legend. XP verzamel je over al je challenges heen, dus je begint nooit meer helemaal opnieuw.",
    },
    {
      title: "Head-to-head",
      body: "Zet jezelf naast één specifieke rivaal en zie op welke statistiek je hem echt verslaat.",
    },
    {
      title: "Wrapped",
      body: "Aan het einde krijgt iedereen een deelbare terugblik: grootste winst, langste reeks, favoriete sport.",
    },
    {
      title: "Voorspellingen",
      body: "Voordat de challenge begint voorspelt iedereen de winnaar. Bij de start liggen de stemmen vast en gaan ze open.",
    },
  ],
};

export const fairPlay = {
  title: "Fair play, ingebouwd",
  subtitle: "Een competitie tussen vrienden werkt alleen als niemand kan sjoemelen.",
  points: [
    {
      title: "Odds staan vast bij plaatsen",
      body: "De quotering die je ziet is de quotering die je krijgt. Een nieuwe import verandert nooit een lopende bet.",
    },
    {
      title: "Bets pas zichtbaar na aftrap",
      body: "Je ziet de picks van medespelers pas als hun wedstrijd is begonnen. Niemand kopieert het veld.",
    },
    {
      title: "Odds staan een week vast",
      body: "Iedereen wedt op dezelfde prijzen. Niemand wacht op een betere quotering die later binnenkomt.",
    },
    {
      title: "Iedereen kan betwisten",
      body: "Klopt er iets niet aan een bet? Eén tik en de admin kijkt ernaar. Alles wordt gelogd.",
    },
  ],
};

export const faq = {
  title: "Veelgestelde vragen",
  items: [
    {
      q: "Speel ik met echt geld?",
      a: "In de app wed je uitsluitend met virtueel saldo — er staat nooit echt geld op het spel bij een bet. De inleg en het prijzengeld zijn wel echt: die gaan in USDT, naar en vanaf de adressen die je zelf beheert.",
    },
    {
      q: "Hoe betaal ik mijn inleg?",
      a: "In USDT, via Tron, BNB Chain, Solana of Ethereum. De app rekent het bedrag voor je om, toont het adres met een QR-code, en jij plakt daarna je transactiehash terug. Zodra de organisator hem op de blockchain heeft teruggevonden, sta je in de challenge.",
    },
    {
      q: "Zitten er kosten bovenop de inleg?",
      a: "Dat bepaalt de organisator per challenge. Rekent hij servicekosten, dan zie je die uitgesplitst op het betaalscherm voordat je iets verstuurt — nooit achteraf.",
    },
    {
      q: "Heb ik een bookmaker-account nodig?",
      a: "Nee. Je wedt uitsluitend in de app, met virtueel saldo. Een account bij een bookmaker heb je nergens voor nodig.",
    },
    {
      q: "Hoeveel spelers hebben we nodig?",
      a: "Vanaf twee. Tot en met zes spelers pakt de winnaar alles, daarboven wordt de pot verdeeld — hoe groter het veld, hoe meer plekken er in de prijzen vallen. Bij honderd spelers zijn dat er twaalf.",
    },
    {
      q: "Wat als iemand door zijn saldo heen is?",
      a: "Dan is die speler bust en kan hij niet meer wedden — tenzij de organisator rebuys heeft aangezet. Bust levert overigens ook een badge op.",
    },
    {
      q: "Hoe log ik in?",
      a: "Met alleen je e-mailadres. Je krijgt een inlogcode toegestuurd, geen wachtwoord om te onthouden.",
    },
    {
      q: "Werkt het op mijn telefoon?",
      a: "Daar is het voor gemaakt. Je kunt de app aan je beginscherm toevoegen en hem gebruiken alsof het een geïnstalleerde app is.",
    },
  ],
};

export const finalCta = {
  title: "Klaar om je vriendengroep wakker te schudden?",
  body: "Maak een account, stuur de link rond en kijk wie er over een maand nog praat.",
  primary: "Gratis account maken",
  secondary: "Eerst de regels lezen",
};

export const footer = {
  tagline: "De maandelijkse virtuele sportsbetting-challenge voor vriendengroepen.",
  responsible:
    "Speel bewust. League of Gamblers is een spel met virtueel geld tussen vrienden — geen kansspelaanbieder. 18+.",
};
