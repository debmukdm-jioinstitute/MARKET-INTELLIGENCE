"use client";

import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

const axis = { fontSize: 11, fill: "#8b93a1", tickLine: false };
const grid = { stroke: "rgba(255,255,255,0.06)" };

export function NavChart({
  data,
  aKey = "value",
  bKey,
  aName = "Portfolio",
  bName = "Benchmark",
}: {
  data: Record<string, string | number>[];
  aKey?: string;
  bKey?: string;
  aName?: string;
  bName?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <AreaChart data={data}>
        <defs>
          <linearGradient id="navFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#d4af37" stopOpacity={0.28} />
            <stop offset="100%" stopColor="#d4af37" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey="date" {...axis} minTickGap={48} />
        <YAxis {...axis} width={64} domain={["auto", "auto"]} tickFormatter={(v) => Number(v).toLocaleString()} />
        <Tooltip
          contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 12 }}
        />
        <Area type="monotone" dataKey={aKey} name={aName} stroke="#d4af37" fill="url(#navFill)" strokeWidth={1.6} />
        {bKey ? (
          <Line type="monotone" dataKey={bKey} name={bName} stroke="#5ec8e8" dot={false} strokeWidth={1.2} />
        ) : null}
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function Bars({
  data,
  x = "name",
  y = "value",
  unit = "pct",
}: {
  data: Record<string, string | number>[];
  x?: string;
  y?: string;
  unit?: "pct" | "raw";
}) {
  const fmt = (v: number) => (unit === "pct" ? `${(Number(v) * 100).toFixed(1)}%` : Number(v).toFixed(2));
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data} layout="vertical" margin={{ left: 16 }}>
        <CartesianGrid {...grid} horizontal={false} />
        <XAxis type="number" {...axis} tickFormatter={(v) => fmt(Number(v))} />
        <YAxis type="category" dataKey={x} {...axis} width={92} />
        <Tooltip
          contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 12 }}
          formatter={(v) => fmt(Number(v))}
        />
        <Bar dataKey={y} fill="#d4af37" radius={3} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PALETTE = ["#d4af37", "#5ec8e8", "#3dd68c", "#c084fc", "#f07178", "#fbbf24", "#60a5fa", "#94a3b8"];

export function Donut({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={86} paddingAngle={2}>
          {data.map((entry, i) => (
            <Cell key={entry.name} fill={PALETTE[i % PALETTE.length]} />
          ))}
        </Pie>
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Tooltip contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 12 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function Lines({
  data,
  keys,
  xKey = "date",
}: {
  data: Record<string, string | number>[];
  keys: { key: string; color: string; name: string }[];
  xKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <LineChart data={data}>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={40} />
        <YAxis {...axis} width={48} domain={["auto", "auto"]} />
        <Tooltip contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 12 }} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        {keys.map((k) => (
          <Line key={k.key} type="monotone" dataKey={k.key} name={k.name} stroke={k.color} dot={false} strokeWidth={1.4} />
        ))}
      </LineChart>
    </ResponsiveContainer>
  );
}

/** Grouped call-vs-put OI by strike — the classic option-chain "OI bars" view. */
export function OiBars({
  data,
  xKey = "strike",
}: {
  data: Record<string, string | number>[];
  xKey?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height="100%">
      <BarChart data={data}>
        <CartesianGrid {...grid} vertical={false} />
        <XAxis dataKey={xKey} {...axis} minTickGap={24} />
        <YAxis {...axis} width={56} tickFormatter={(v) => Number(v).toLocaleString()} />
        <Tooltip
          contentStyle={{ background: "#10151c", border: "1px solid #243040", fontSize: 12 }}
          formatter={(v) => Number(v).toLocaleString()}
        />
        <Legend wrapperStyle={{ fontSize: 11 }} />
        <Bar dataKey="callOi" name="Call OI" fill="#34d399" radius={2} />
        <Bar dataKey="putOi" name="Put OI" fill="#fb7185" radius={2} />
      </BarChart>
    </ResponsiveContainer>
  );
}
