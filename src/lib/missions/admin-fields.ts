// Shared between the admin create-mission form and the createMission action
// so both agree on which params a type needs and how to parse them.
export type MissionParamField = { key: string; label: string; type: "number" | "text" };

export const MISSION_TYPE_OPTIONS: { value: string; label: string; params: MissionParamField[] }[] = [
  {
    value: "win_odds_min",
    label: "Win met minimale odds",
    params: [{ key: "minOdds", label: "Minimale odds (bijv. 20)", type: "number" }],
  },
  {
    value: "win_streak",
    label: "Winstreak",
    params: [{ key: "count", label: "Aantal op rij (bijv. 5)", type: "number" }],
  },
  {
    value: "combi_win",
    label: "Combi winnen",
    params: [{ key: "minSelections", label: "Min. aantal selecties (bijv. 4)", type: "number" }],
  },
  {
    value: "sport_win",
    label: "Meerdere bets winnen in een sport",
    params: [
      { key: "sport", label: "Sport (bijv. Tennis)", type: "text" },
      { key: "count", label: "Aantal", type: "number" },
    ],
  },
  {
    value: "underdog",
    label: "Underdog winnen",
    params: [
      { key: "minOdds", label: "Minimale odds (bijv. 5)", type: "number" },
      { key: "sport", label: "Sport (bijv. Voetbal)", type: "text" },
    ],
  },
  {
    value: "balance_reach",
    label: "Saldo bereiken",
    params: [{ key: "amount", label: "Bedrag (€)", type: "number" }],
  },
  { value: "all_in_win", label: "All-in bet winnen", params: [] },
  {
    value: "profit_day",
    label: "Winst op één dag",
    params: [{ key: "minPercent", label: "Minimaal % winst", type: "number" }],
  },
  {
    value: "profit_week",
    label: "Winst in één week",
    params: [{ key: "minPercent", label: "Minimaal % winst", type: "number" }],
  },
  {
    value: "survive",
    label: "Nooit onder X% van startsaldo zakken",
    params: [
      { key: "minPercent", label: "Minimaal % van startsaldo", type: "number" },
      { key: "window", label: "Aantal dagen", type: "number" },
    ],
  },
  {
    value: "volume",
    label: "Aantal bets in een periode",
    params: [
      { key: "count", label: "Aantal bets", type: "number" },
      { key: "window", label: "Aantal dagen", type: "number" },
    ],
  },
  { value: "manual", label: "Handmatig (admin kent toe)", params: [] },
];
