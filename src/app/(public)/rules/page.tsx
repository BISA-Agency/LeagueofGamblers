import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Spelregels",
  description: "Alles wat je moet weten om mee te doen met League of Gamblers.",
};

const SECTIONS = [
  { id: "hoe-het-werkt", title: "Hoe de challenge werkt" },
  { id: "sportsbook", title: "Het sportsbook" },
  { id: "bewijsbet", title: "De bewijsbet" },
  { id: "settlement", title: "Uitslagen & afrekenen" },
  { id: "missies-badges", title: "Missies en badges" },
  { id: "inleg", title: "Inleg en uitbetaling" },
  { id: "fair-play", title: "Fair play & sancties" },
  { id: "faq", title: "Veelgestelde vragen" },
];

export default function RulesPage() {
  return (
    <main className="mx-auto max-w-2xl px-4 py-10 sm:py-14">
      <div className="mb-10 space-y-2">
        <p className="text-sm font-medium text-accent-brand">Spelregels</p>
        <h1 className="text-3xl font-semibold tracking-tight">
          Hoe League of Gamblers werkt
        </h1>
        <p className="text-muted-foreground">
          Geen kleine lettertjes, geen juridisch jargon — dit is alles wat je moet weten om
          mee te doen.
        </p>
      </div>

      <nav aria-label="Inhoudsopgave" className="mb-10 rounded-lg border border-border p-4">
        <ul className="grid grid-cols-1 gap-x-6 gap-y-1.5 text-sm sm:grid-cols-2">
          {SECTIONS.map((s) => (
            <li key={s.id}>
              <a href={`#${s.id}`} className="text-muted-foreground hover:text-accent-brand">
                {s.title}
              </a>
            </li>
          ))}
        </ul>
      </nav>

      <div className="space-y-12">
        <section id="hoe-het-werkt" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Hoe de challenge werkt</h2>
          <p>
            Elke challenge is een maand-durend spel tussen jou en je vrienden. Bij de start
            krijgt iedereen die zijn inleg betaald heeft hetzelfde{" "}
            <strong className="text-foreground">virtuele startsaldo</strong> (standaard
            €10.000). Vanaf dat moment wed je met dat virtuele geld — via het sportsbook in
            de app, of via een bewijsbet.
          </p>
          <p>
            Aan het einde van de challenge telt alleen je eindsaldo. Wie het hoogste saldo
            heeft, wint. Sta je gelijk met iemand anders, dan beslist eerst je winstpercentage
            op afgeronde bets, en anders wie het minste aantal bets heeft geplaatst.
          </p>
          <p>
            Heb je op de einddatum nog open bets staan? Wedstrijden die pas na de einddatum
            beginnen worden geannuleerd (je inzet krijg je terug). Wedstrijden die al bezig
            waren blijven gewoon meetellen — de challenge sluit pas echt af als alles is
            afgerekend.
          </p>
          <p>
            Kom je op €0 te staan zonder open bets? Dan ben je{" "}
            <strong className="text-foreground">bust 💀</strong>. Je blijft onderaan het
            klassement staan, maar kunt niet meer wedden.
          </p>
          <p>
            Er zijn geen inzetlimieten: geen minimum, geen maximum, geen limiet op het aantal
            bets. Zolang je inzet niet hoger is dan je saldo, mag alles — inclusief all-in op
            dag 1.
          </p>
        </section>

        <section id="sportsbook" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Het sportsbook</h2>
          <p>
            In de app zit een eigen sportsbook met odds voor de grote competities en
            sporten. Deze odds worden <strong className="text-foreground">één keer per
            week</strong> ververst en staan daarna vast tot de volgende update — ook als de
            echte bookmakers hun lijnen aanpassen. Dat is bewust: iedereen speelt op dezelfde
            odds, dus het is eerlijk. Wie het nieuws beter volgt (blessures, opstellingen,
            vorm) heeft een voordeel — en dat is precies de bedoeling.
          </p>
          <p>
            Je kunt losse bets plaatsen, of meerdere selecties combineren tot een{" "}
            <strong className="text-foreground">combi</strong> (de odds worden dan
            vermenigvuldigd). Selecties uit dezelfde wedstrijd kun je niet combineren.
          </p>
          <p>
            De quotering die je ziet op het moment dat je plaatst, wordt vastgelegd bij je
            bet en verandert daarna nooit meer.{" "}
            <strong className="text-foreground">
              Een wedstrijd sluit automatisch zodra hij begint
            </strong>{" "}
            — daarna kun je er niet meer op wedden. Je kunt een bet binnen 5 minuten na
            plaatsen nog aanpassen of annuleren, zolang de wedstrijd nog niet begonnen is.
          </p>
          <p>
            Grote sportnieuwtjes (bijvoorbeeld een geblesseerde sterspeler) kunnen ervoor
            zorgen dat de admin een markt tijdelijk schorst. Wordt een wedstrijd afgelast of
            verplaatst, dan wordt de markt void verklaard en krijg je je inzet terug.
          </p>
          <p>
            Om te voorkomen dat spelers elkaars bets kopiëren, zijn bets van anderen{" "}
            <strong className="text-foreground">verborgen tot de wedstrijd begint</strong>.
            Tot die tijd zie je alleen dat iemand bijvoorbeeld &ldquo;3 bets open&rdquo; heeft staan.
          </p>
        </section>

        <section id="bewijsbet" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">De bewijsbet</h2>
          <p>
            Wil je wedden op iets dat niet in het sportsbook staat — een andere competitie,
            een cornermarkt, een doelpuntenmaker, een special bij je eigen bookmaker — dan
            gebruik je een <strong className="text-foreground">bewijsbet</strong>. Dit is
            geen sportsbook-bet: je voert zelf in wat je gewed zou hebben, en levert bewijs.
          </p>
          <p>Je bewijsbet moet aan een paar harde eisen voldoen:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>
              De bet moet in de app staan{" "}
              <strong className="text-foreground">vóórdat de wedstrijd begint</strong>. De
              app registreert zelf het moment van uploaden — je kunt de aanvangstijd achteraf
              niet meer wijzigen.
            </li>
            <li>
              Je levert een <strong className="text-foreground">screenshot</strong> van de
              bet slip bij de bookmaker, met daarop zichtbaar: de selecties, de quoteringen,
              de ingevulde inzet, en het liefst ook de klok/statusbalk van je telefoon. Je
              hoeft de bet niet écht te plaatsen — alleen het bedrag invullen zodat het op de
              foto staat is genoeg.
            </li>
            <li>
              De screenshot moet gemaakt zijn <strong className="text-foreground">vóór</strong>{" "}
              aanvang. Is de wedstrijd al bezig (live-markering, veranderde odds, tussenstand
              zichtbaar), dan wordt de bet afgekeurd.
            </li>
            <li>
              De inzet en de quoteringen op de screenshot moeten exact overeenkomen met wat je
              in de app hebt ingevuld.
            </li>
          </ul>
          <p>
            Elke bewijsbet krijgt een status: <strong className="text-foreground">⏳
            ongecontroleerd</strong> (telt voorlopig al mee), <strong className="text-foreground">
            ✓ goedgekeurd</strong> of <strong className="text-foreground">✗ afgekeurd</strong>.
            De admin controleert elke bewijsbet. Wordt een bet afgekeurd, dan krijg je je
            inzet terug. Medespelers kunnen een bewijsbet die hen verdacht voorkomt ook
            betwisten — de admin beslist dan.
          </p>
          <p>
            Net als sportsbook-bets zijn bewijsbets (en de screenshot) verborgen voor
            medespelers tot de wedstrijd begint.
          </p>
        </section>

        <section id="settlement" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Uitslagen & afrekenen</h2>
          <p>
            Sportsbook-bets worden automatisch afgerekend zodra de officiële uitslag bekend
            is, op basis van de <strong className="text-foreground">reguliere speeltijd</strong>{" "}
            (dus zonder verlenging of strafschoppen, tenzij een markt daar expliciet over
            gaat). Wordt een wedstrijd afgelast of uitgesteld tot buiten de challenge, dan
            wordt de bet void verklaard en krijg je je inzet terug.
          </p>
          <p>
            Voor markten die de app niet automatisch kan afrekenen, en voor alle bewijsbets,
            geldt: settlement gebeurt handmatig (door jou bij een bewijsbet, of door de admin
            bij een custom event), en is altijd zichtbaar mét de bron van de uitslag.
          </p>
        </section>

        <section id="missies-badges" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Missies en badges</h2>
          <p>
            Naast het klassement zijn er <strong className="text-foreground">missies</strong>{" "}
            — kleine uitdagingen zoals &ldquo;win een bet met quotering ≥ 20&rdquo; of
            &ldquo;win 5 bets op rij&rdquo;. Sommige missies leveren een badge en XP op, andere ook een klein bedrag uit
            de echte pot (dat gaat vooraf van het missiebudget af, bepaald door de admin).
            Sommige missies zijn geheim en onthullen zichzelf pas als je ze haalt.
          </p>
          <p>
            <strong className="text-foreground">Badges</strong> zijn permanente emblemen op
            je profiel — van je eerste winnende bet tot het winnen van een hele challenge. Ze
            blijven zichtbaar, ook in latere challenges.
          </p>
        </section>

        <section id="inleg" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Inleg en uitbetaling</h2>
          <p>
            De app zelf verwerkt geen echt geld. Buiten de app om leggen alle deelnemers een
            echte inleg in een gezamenlijke pot (standaard €100 per persoon — de organisator
            van jouw challenge bepaalt het exacte bedrag en hoe die inleg overgemaakt wordt).
            De app houdt alleen bij wie betaald heeft, hoe de pot verdeeld wordt, en wie wat
            wint.
          </p>
          <p>
            Alleen spelers van wie de inleg is geregistreerd tellen mee op het klassement en
            bij de potverdeling. De verdeling hangt af van het aantal betalende spelers en
            wordt live getoond op de challenge-pagina, bijvoorbeeld: bij 9 betaalde spelers is
            de pot €900, verdeeld als €450 voor #1, €270 voor #2 en €180 voor #3.
          </p>
        </section>

        <section id="fair-play" className="scroll-mt-20 space-y-3">
          <h2 className="text-xl font-semibold tracking-tight">Fair play & sancties</h2>
          <p>Om het voor iedereen eerlijk te houden:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            <li>Alles wordt server-side gecontroleerd: je kunt nooit meer inzetten dan je saldo, en nooit meer wedden op een wedstrijd die al begonnen is.</li>
            <li>Bewijsbets worden altijd gecontroleerd door de admin, en kunnen door medespelers betwist worden.</li>
            <li>Elke ingreep van de admin (saldo-correcties, geannuleerde bets, sancties) wordt gelogd en is achteraf te herleiden.</li>
          </ul>
          <p>
            Bij een afgekeurde bewijsbet (bijvoorbeeld een nep- of live-screenshot, of een
            inzet die niet overeenkomt) kan de admin een sanctie opleggen: een waarschuwing,
            een saldo-correctie, of in ernstige gevallen diskwalificatie. Sancties zijn
            zichtbaar op je profiel, zodat de groep het ook ziet.
          </p>
        </section>

        <section id="faq" className="scroll-mt-20 space-y-4">
          <h2 className="text-xl font-semibold tracking-tight">Veelgestelde vragen</h2>
          <div className="space-y-4">
            <div>
              <p className="font-medium">Is dit echt geld?</p>
              <p className="text-muted-foreground">
                Nee. Alle bets zijn met virtueel geld. De enige echte transactie is je inleg
                in de pot, die buiten de app om geregeld wordt.
              </p>
            </div>
            <div>
              <p className="font-medium">Moet ik een account bij een bookmaker hebben?</p>
              <p className="text-muted-foreground">
                Voor het sportsbook in de app: nee. Voor een bewijsbet heb je een bookmaker-app
                nodig om er een screenshot van te maken — je hoeft de bet daar niet echt te
                plaatsen of geld te storten.
              </p>
            </div>
            <div>
              <p className="font-medium">Wat als een wedstrijd wordt afgelast?</p>
              <p className="text-muted-foreground">
                Dan wordt de bet void verklaard en krijg je je inzet terug — zowel bij
                sportsbook-bets als bij bewijsbets.
              </p>
            </div>
            <div>
              <p className="font-medium">Hoe krijg ik mijn winst?</p>
              <p className="text-muted-foreground">
                Na afloop van de challenge verdeelt de organisator de echte pot volgens de
                staffel die op de challenge-pagina staat. De app registreert wie wat krijgt;
                de uitbetaling zelf loopt buiten de app om.
              </p>
            </div>
            <div>
              <p className="font-medium">Kan ik met meerdere vriendengroepen tegelijk spelen?</p>
              <p className="text-muted-foreground">
                Ja. Je kunt in meerdere challenges tegelijk zitten, elk met een eigen saldo.
                In de app kun je wisselen tussen je challenges.
              </p>
            </div>
          </div>
        </section>
      </div>

      <div className="mt-14 border-t border-border pt-6 text-sm text-muted-foreground">
        <Link href="/" className="text-accent-brand underline underline-offset-2">
          Terug naar de homepage
        </Link>
      </div>
    </main>
  );
}
