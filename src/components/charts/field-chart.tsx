"use client";

import { Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const LINE_COLORS = [
  "#a3e635",
  "#38bdf8",
  "#f472b6",
  "#fb923c",
  "#a78bfa",
  "#2dd4bf",
  "#facc15",
  "#f87171",
];

export type FieldChartSeries = {
  username: string;
  points: { date: string; balance: number }[];
};

export function FieldChart({ series }: { series: FieldChartSeries[] }) {
  if (series.length === 0 || series.every((s) => s.points.length < 2)) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nog niet genoeg dagen data voor een grafiek.
      </p>
    );
  }

  const dates = Array.from(new Set(series.flatMap((s) => s.points.map((p) => p.date)))).sort();
  const merged = dates.map((date) => {
    const row: Record<string, string | number> = { date };
    for (const s of series) {
      const point = s.points.find((p) => p.date === date);
      if (point) row[s.username] = point.balance;
    }
    return row;
  });

  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={merged} margin={{ top: 8, right: 8, bottom: 0, left: 0 }}>
        <XAxis
          dataKey="date"
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={{ stroke: "var(--border)" }}
          tickLine={false}
          tickFormatter={(d: string) => d.slice(5)}
        />
        <YAxis
          tick={{ fontSize: 11, fill: "var(--muted-foreground)" }}
          axisLine={false}
          tickLine={false}
          width={48}
          tickFormatter={(v: number) => `€${(v / 1000).toFixed(0)}k`}
        />
        <Tooltip
          contentStyle={{
            background: "var(--popover)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-md)",
            fontSize: 12,
          }}
          labelStyle={{ color: "var(--foreground)" }}
          formatter={(value) => `€${Number(value).toLocaleString("nl-NL")}`}
        />
        {series.map((s, i) => (
          <Line
            key={s.username}
            type="monotone"
            dataKey={s.username}
            stroke={LINE_COLORS[i % LINE_COLORS.length]}
            strokeWidth={2}
            dot={false}
            connectNulls
          />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}
