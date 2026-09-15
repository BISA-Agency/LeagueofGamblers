import Link from "next/link";
import { UserAvatar } from "@/components/profile/user-avatar";
import { cn } from "@/lib/utils";

/** The "tournament info" pane: everything the row can't fit, computed server-side in the page. */
export type LobbyDetail = {
  slug: string;
  joined: boolean;
  started: boolean;
  descriptionMd: string | null;
  prizes: {
    pot: number;
    /** Pot if every joiner pays — shown when someone still owes their buy-in. */
    potentialPot: number;
    unpaidCount: number;
    /** Based on the pot that's actually in, or the potential pot while nobody has paid yet. */
    split: { rank: number; amount: number; percent: number }[];
    splitIsProjected: boolean;
    hardcore: boolean;
    bountyPerPlayer: number | null;
  };
  players: {
    username: string;
    avatarUrl: string | null;
    /** Null until the challenge has started — before that everyone is on the starting balance. */
    balance: number | null;
    rank: number | null;
    paid: boolean;
    bust: boolean;
    isMe: boolean;
  }[];
  structure: {
    startingBalance: number;
    buyIn: number;
    feePercent: number;
    sports: string[];
    allowRebuy: boolean;
    lateJoinDays: number;
    missionBudget: number;
    missionsFromPot: boolean;
    startAt: Date;
    endAt: Date;
  };
};

const money = new Intl.NumberFormat("nl-NL", { minimumFractionDigits: 0, maximumFractionDigits: 0 });
const longDate = new Intl.DateTimeFormat("nl-NL", {
  weekday: "short",
  day: "numeric",
  month: "long",
  timeZone: "Europe/Amsterdam",
});

const ordinal = (n: number) => `${n}e`;

const SHOWN_PLAYERS = 8;

export function LobbyDetailPanel({ detail }: { detail: LobbyDetail }) {
  const { prizes, players, structure } = detail;
  const me = players.find((p) => p.isMe) ?? null;
  const visiblePlayers = players.slice(0, SHOWN_PLAYERS);
  const hidden = players.length - visiblePlayers.length;
  const meHidden = me && !visiblePlayers.includes(me) ? me : null;

  return (
    <div className="grid gap-6 px-4 py-5 text-sm md:grid-cols-3 md:px-5">
      <section>
        <h3 className="text-xs text-muted-foreground">Prijzen</h3>
        <p className="mt-1 text-2xl font-semibold tabular-nums text-accent-brand">
          €{money.format(prizes.pot)}
        </p>
        {prizes.unpaidCount > 0 && (
          <p className="text-xs text-muted-foreground">
            €{money.format(prizes.potentialPot)} als iedereen betaalt ({prizes.unpaidCount} nog open)
          </p>
        )}

        {prizes.hardcore ? (
          <p className="mt-3 text-foreground/90">Hardcore: de winnaar pakt alles.</p>
        ) : prizes.split.length > 0 ? (
          <ol className="mt-3 space-y-1">
            {prizes.split.map((entry) => (
              <li key={entry.rank} className="flex items-baseline gap-3 tabular-nums">
                <span className="w-6 text-muted-foreground">{ordinal(entry.rank)}</span>
                <span className="font-medium">€{money.format(entry.amount)}</span>
                <span className="text-xs text-muted-foreground">{entry.percent}%</span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="mt-3 text-muted-foreground">Verdeling volgt zodra de eerste inleg binnen is.</p>
        )}
        {prizes.splitIsProjected && prizes.split.length > 0 && (
          <p className="mt-1 text-xs text-muted-foreground">Verdeling bij volledige betaling.</p>
        )}
        {prizes.bountyPerPlayer !== null && (
          <p className="mt-3 text-xs text-muted-foreground">
            Bounty: €{money.format(prizes.bountyPerPlayer)} per uitgevallen speler, los van de pot.
          </p>
        )}
      </section>

      <section>
        <h3 className="text-xs text-muted-foreground">
          {detail.started ? "Stand" : "Spelers"}
          <span className="ml-1.5 tabular-nums">{players.length}</span>
        </h3>
        {players.length === 0 ? (
          <p className="mt-2 text-muted-foreground">Nog niemand — jij kunt de eerste zijn.</p>
        ) : (
          <ol className="mt-2 space-y-1.5">
            {visiblePlayers.map((p) => (
              <PlayerLine key={p.username} player={p} started={detail.started} />
            ))}
            {hidden > 0 && (
              <li className="text-xs text-muted-foreground">
                {meHidden ? (
                  <>
                    … {hidden - 1 > 0 ? `${hidden - 1} anderen, en ` : ""}
                    <PlayerLine player={meHidden} started={detail.started} inline />
                  </>
                ) : (
                  `+${hidden} anderen`
                )}
              </li>
            )}
          </ol>
        )}
      </section>

      <section>
        <h3 className="text-xs text-muted-foreground">Structuur</h3>
        <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 tabular-nums">
          <Row label="Startsaldo">€{money.format(structure.startingBalance)} virtueel</Row>
          <Row label="Inleg">
            €{money.format(structure.buyIn)}
            {structure.feePercent > 0 && (
              <span className="text-muted-foreground"> + {structure.feePercent}% fee</span>
            )}
          </Row>
          {structure.sports.length > 0 && (
            <Row label="Competities">
              <SportsList sports={structure.sports} />
            </Row>
          )}
          <Row label="Rebuy">{structure.allowRebuy ? "Toegestaan na bust" : "Nee"}</Row>
          {structure.lateJoinDays > 0 && (
            <Row label="Late registratie">
              tot {structure.lateJoinDays} {structure.lateJoinDays === 1 ? "dag" : "dagen"} na de start
            </Row>
          )}
          {structure.missionBudget > 0 && (
            <Row label="Missies">
              €{money.format(structure.missionBudget)}{" "}
              <span className="text-muted-foreground">
                {structure.missionsFromPot ? "uit de pot, al verrekend" : "extra, bovenop de pot"}
              </span>
            </Row>
          )}
          <Row label="Start">{longDate.format(structure.startAt)}</Row>
          <Row label="Einde">{longDate.format(structure.endAt)}</Row>
        </dl>
      </section>

      {detail.descriptionMd && (
        <p className="whitespace-pre-wrap text-muted-foreground md:col-span-3">{detail.descriptionMd}</p>
      )}

      <div className="flex flex-wrap gap-x-5 gap-y-1 text-sm md:col-span-3">
        {detail.joined && (
          <Link href={`/app/challenge/${detail.slug}`} className="text-accent-brand hover:underline">
            Bekijk challenge
          </Link>
        )}
        <Link
          href={`/c/${detail.slug}`}
          className="text-muted-foreground hover:text-foreground hover:underline"
        >
          Deel uitnodiging
        </Link>
      </div>
    </div>
  );
}

function Row({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <>
      <dt className="text-muted-foreground">{label}</dt>
      <dd>{children}</dd>
    </>
  );
}

function PlayerLine({
  player,
  started,
  inline,
}: {
  player: LobbyDetail["players"][number];
  started: boolean;
  inline?: boolean;
}) {
  const Wrapper = inline ? "span" : "li";
  return (
    <Wrapper
      className={cn(
        "flex items-center gap-2",
        inline && "inline-flex",
        player.isMe && "rounded-md bg-accent-brand/10 px-1.5 py-0.5 -mx-1.5"
      )}
    >
      {started && player.rank !== null && (
        <span className="w-5 shrink-0 text-right text-xs tabular-nums text-muted-foreground">
          {player.rank}
        </span>
      )}
      <UserAvatar username={player.username} avatarUrl={player.avatarUrl} size={20} />
      <span className={cn("min-w-0 truncate", player.bust && "text-muted-foreground line-through")}>
        {player.username}
      </span>
      {player.isMe && <span className="shrink-0 text-xs text-accent-brand">jij</span>}
      {!player.paid && !started && (
        <span className="shrink-0 text-xs text-muted-foreground">wacht op betaling</span>
      )}
      {started && player.balance !== null && (
        <span className="ml-auto shrink-0 tabular-nums">€{money.format(player.balance)}</span>
      )}
    </Wrapper>
  );
}

const SHOWN_SPORTS = 4;

/** The first few by name, the rest as a count — 22 competitions in a row is a wall, not information. */
function SportsList({ sports }: { sports: string[] }) {
  const shown = sports.slice(0, SHOWN_SPORTS);
  const rest = sports.length - shown.length;
  return (
    <span title={sports.join(", ")}>
      {shown.join(", ")}
      {rest > 0 && <span className="text-muted-foreground"> +{rest}</span>}
    </span>
  );
}
