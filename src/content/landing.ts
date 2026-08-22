// All landing-page copy in one place (§10) — so the wording can be tweaked
// without touching layout, and so there's a single file to proofread.

export const hero = {
  eyebrow: "De maandelijkse onderlinge competitie",
  title: "€10.000 virtueel.\nEén maand.\nHoogste saldo wint de pot.",
  subtitle:
    "Zet je vriendengroep tegen elkaar op in een maand vol bets, trash talk en één winnaar. Je speelt met virtueel geld — de inleg regel je onderling.",
  primaryCta: "Gratis account maken",
  secondaryCta: "Ik heb al een account",
  note: "Geen wachtwoord nodig — je logt in met een code per e-mail",
};

export const stats = [
  { value: "€10.000", label: "virtueel startsaldo", hint: "voor iedereen gelijk" },
  { value: "1 maand", label: "per challenge", hint: "elke maand opnieuw" },
  { value: "1 winnaar", label: "pakt de pot", hint: "of top 3 bij 7+ spelers" },
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
      body: "De inleg gaat onderling — contant of via een tikkie. Jij vinkt af wie betaald heeft; de pot groeit vanzelf mee.",
    },
    {
      title: "Wedden maar",
      body: "Elke week verse odds in het sportsbook. Wed je ergens anders? Upload een screenshot als bewijsbet.",
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

export const betTypes = {
  title: "Twee manieren om te wedden",
  subtitle: "Het sportsbook voor het gemak, de bewijsbet voor al het andere.",
  cards: [
    {
      title: "Het sportsbook",
      body: "Voetbal, basketbal, tennis en meer — met odds die een week lang vaststaan, zodat niemand kan wachten op een betere prijs.",
      points: [
        "1X2, over/under en handicaps",
        "Combi's bouwen in de bet slip",
        "Odds worden vastgelegd bij plaatsen",
        "Automatisch afgerekend op de echte uitslag",
      ],
    },
    {
      title: "De bewijsbet",
      body: "Wil je wedden op iets wat niet in het sportsbook staat? Plaats 'm bij je eigen bookmaker en upload een screenshot.",
      points: [
        "Elke markt bij elke bookmaker",
        "Screenshot vóór aanvang verplicht",
        "Admin controleert en keurt goed",
        "Medespelers kunnen betwisten",
      ],
    },
  ],
};

export const potSection = {
  title: "Wat kun je winnen?",
  subtitle:
    "De pot is simpelweg de inleg van iedereen die betaald heeft. Schuif eraan en zie wat er te verdelen valt.",
  disclaimerTitle: "De app raakt geen echt geld aan",
  disclaimer:
    "Inleg en uitbetaling regelen jullie onderling — contant of per overboeking. De app houdt alleen bij wie betaald heeft en wat er uitgekeerd moet worden.",
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
      title: "Screenshots worden gecontroleerd",
      body: "Elke bewijsbet gaat langs de admin. Een live-markering of tussenstand op de foto betekent afkeuring.",
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
      a: "Nee. In de app wed je uitsluitend met virtueel saldo. De inleg en de uitbetaling van de pot regelen jullie onderling; de app houdt alleen de administratie bij.",
    },
    {
      q: "Heb ik een bookmaker-account nodig?",
      a: "Nee. Het sportsbook in de app is genoeg om mee te doen. Een bewijsbet is optioneel, voor wie op iets wil wedden dat er niet in staat.",
    },
    {
      q: "Hoeveel spelers hebben we nodig?",
      a: "Vanaf twee. Tot en met zes spelers pakt de winnaar de hele pot; vanaf zeven spelers wordt er verdeeld over de top 3 (50/30/20).",
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
