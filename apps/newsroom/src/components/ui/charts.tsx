import { Area, AreaChart, Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

const BRAND = "#3c63ed";

export function AreaSpark({ data, height = 120, color = BRAND, label }: { data: { x: string; y: number }[]; height?: number; color?: string; label: string }) {
  const id = `g-${label.replace(/\W/g, "")}`;
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 4, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.22} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Tooltip contentStyle={{ borderRadius: 10, border: "1px solid #e7e8ef", fontSize: 12 }} labelStyle={{ color: "#6b6e80" }} />
          <Area type="monotone" dataKey="y" stroke={color} strokeWidth={2} fill={`url(#${id})`} isAnimationActive={false} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function AreaFull({
  data,
  height = 240,
  label,
  format = (n: number) => String(n),
}: {
  data: { x: string; y: number }[];
  height?: number;
  label: string;
  format?: (n: number) => string;
}) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
          <defs>
            <linearGradient id="gfull" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={BRAND} stopOpacity={0.2} />
              <stop offset="100%" stopColor={BRAND} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid vertical={false} stroke="#e7e8ef" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a9cac" }} minTickGap={24} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a9cac" }} tickFormatter={format} width={48} />
          <Tooltip formatter={(v) => format(Number(v))} cursor={{ stroke: BRAND, strokeOpacity: 0.35, strokeDasharray: "3 3" }} contentStyle={{ borderRadius: 10, border: "1px solid #e7e8ef", fontSize: 12 }} />
          <Area type="monotone" dataKey="y" stroke={BRAND} strokeWidth={2} fill="url(#gfull)" isAnimationActive={false} activeDot={{ r: 5, stroke: "#fff", strokeWidth: 2, fill: BRAND }} />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}

export function BarsMini({ data, height = 140, label, color = BRAND }: { data: { x: string; y: number }[]; height?: number; label: string; color?: string }) {
  return (
    <div role="img" aria-label={label} style={{ height }} className="w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 4, right: 0, left: -24, bottom: 0 }}>
          <CartesianGrid vertical={false} stroke="#e7e8ef" />
          <XAxis dataKey="x" tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a9cac" }} />
          <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 11, fill: "#9a9cac" }} allowDecimals={false} />
          <Tooltip cursor={{ fill: "#f7f7fa" }} contentStyle={{ borderRadius: 10, border: "1px solid #e7e8ef", fontSize: 12 }} />
          <Bar dataKey="y" fill={color} radius={[4, 4, 0, 0]} isAnimationActive={false} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
