import { useMemo, useState } from "react";
import { Navigate } from "react-router-dom";
import { Download, Info } from "lucide-react";
import { Layer, Rectangle, ResponsiveContainer, Sankey, Tooltip } from "recharts";
import clsx from "clsx";
import useSWR from "swr";
import { tokenStore } from "@/api/staffAuth";
import { AreaFull } from "@/components/ui/charts";
import { Avatar, Button, Card, CardTitle, PageHeader, Pill, SectionDot, Segmented, Tabs, inputCls } from "@/components/ui/primitives";
import { SECTION_LABEL, SEVERITY_POINTS, type Article, type SectionKey } from "@/domain/types";
import { useNewsroom } from "@/state/store";

type Tab = "content" | "reviews" | "audience";
type Metric = "views" | "engaged";
const nf = new Intl.NumberFormat();
const compact = new Intl.NumberFormat(undefined, { notation: "compact", maximumFractionDigits: 1 });

const fmtDuration = (sec: number) => `${Math.floor(sec / 60)}m ${String(Math.round(sec % 60)).padStart(2, "0")}s`;

export default function Analytics() {
  const { state, actor, can } = useNewsroom();
  const [tab, setTab] = useState<Tab>("content");
  const [range, setRange] = useState(30);
  const [section, setSection] = useState<SectionKey | "all">("all");
  const [metric, setMetric] = useState<Metric>("views");

  const scoped = useMemo(() => {
    const published = state.articles.filter((a) => a.analytics.views > 0);
    if (actor.role === "admin") return published;
    if (actor.role === "reporter") return published.filter((a) => a.authorId === actor.id);
    const team = new Set(state.staff.filter((s) => s.editorId === actor.id).map((s) => s.id));
    team.add(actor.id);
    return published.filter((a) => team.has(a.authorId));
  }, [state, actor]);

  const items = scoped.filter((a) => (section === "all" ? true : a.section === section));

  const totals = useMemo(() => {
    const views = items.reduce((n, a) => n + a.analytics.views, 0);
    const engagedSec = items.reduce((n, a) => n + a.analytics.views * a.analytics.avgEngagedSec, 0);
    const read = items.reduce((n, a) => n + a.analytics.views * a.analytics.readThrough, 0);
    const src = items.reduce(
      (acc, a) => ({
        direct: acc.direct + a.analytics.source.direct, search: acc.search + a.analytics.source.search,
        social: acc.social + a.analytics.source.social, internal: acc.internal + a.analytics.source.internal,
      }),
      { direct: 0, search: 0, social: 0, internal: 0 },
    );
    return {
      views,
      avgEngaged: views ? engagedSec / views : 0,
      readThrough: views ? read / views : 0,
      saves: items.reduce((n, a) => n + a.analytics.saves, 0),
      shares: items.reduce((n, a) => n + a.analytics.shares, 0),
      src,
    };
  }, [items]);

  const series = useMemo(() => {
    const days = Array.from({ length: range }, (_, i) => {
      const idx = 30 - range + i;
      const d = new Date(Date.now() - (29 - idx) * 86_400_000);
      const views = items.reduce((n, a) => n + a.analytics.daily[idx], 0);
      const hours = items.reduce((n, a) => n + (a.analytics.daily[idx] * a.analytics.avgEngagedSec) / 3600, 0);
      return { x: d.toLocaleDateString(undefined, { month: "short", day: "numeric" }), y: metric === "views" ? views : Math.round(hours * 10) / 10 };
    });
    return days;
  }, [items, range, metric]);

  const best = [...items].sort((a, b) => b.analytics.views - a.analytics.views)[0];
  const srcTotal = totals.src.direct + totals.src.search + totals.src.social + totals.src.internal || 1;
  const topSource = (Object.entries(totals.src) as [string, number][]).sort((a, b) => b[1] - a[1])[0];

  if (!can("analytics.own")) return <Navigate to="/" replace />;

  const tabs: { id: Tab; label: string }[] = [{ id: "content", label: actor.role === "reporter" ? "My articles" : "Content" }];
  if (can("analytics.team")) tabs.push({ id: "reviews", label: "Reviews" });
  if (can("analytics.audience")) tabs.push({ id: "audience", label: "Audience" });

  return (
    <>
      <PageHeader title="Analytics" subtitle={actor.role === "reporter" ? "Your articles only." : actor.role === "editor" ? "You and your reporters." : "The whole newsroom."}>
        <Button disabled title="CSV export arrives with the analytics API">
          <Download className="size-4" /> Export
        </Button>
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        {tabs.length > 1 && <Tabs label="Analytics views" value={tab} onChange={setTab} items={tabs} />}
        {tab === "content" && (
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <select aria-label="Date range" className={clsx(inputCls, "w-[130px]!")} value={range} onChange={(e) => setRange(Number(e.target.value))}>
              <option value={7}>Last 7 days</option>
              <option value={14}>Last 14 days</option>
              <option value={30}>Last 30 days</option>
            </select>
            <select aria-label="Section" className={clsx(inputCls, "w-[130px]!")} value={section} onChange={(e) => setSection(e.target.value as SectionKey | "all")}>
              <option value="all">All sections</option>
              {Object.entries(SECTION_LABEL).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {tab === "content" && (
        <>
          <div className="grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
            <Big label="Views" value={compact.format(totals.views)} />
            <Big label="Avg engaged time" value={fmtDuration(totals.avgEngaged)} />
            <Big label="Read-through" value={`${Math.round(totals.readThrough * 100)}%`} />
            <Big label="Saves and shares" value={compact.format(totals.saves + totals.shares)} />
          </div>

          <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.6fr)]">
            <div className="space-y-5 text-[14px] leading-relaxed">
              <div>
                <h2 className="mb-1 text-[14px] font-medium text-muted">What readers did</h2>
                {best ? (
                  <p>
                    <b className="font-serif font-medium">{best.headline}</b> led with {nf.format(best.analytics.views)} views. Readers stayed {fmtDuration(totals.avgEngaged)} on average and {Math.round(totals.readThrough * 100)}% reached the end.
                  </p>
                ) : (
                  <p className="text-muted">No published articles in this view yet.</p>
                )}
              </div>
              <div>
                <h2 className="mb-1 text-[14px] font-medium text-muted">Where they came from</h2>
                <p>
                  {topSource ? (
                    <>
                      {Math.round((topSource[1] / srcTotal) * 100)}% arrived via <b className="font-medium">{topSource[0]}</b>. Only the referrer domain is recorded; there is no cross-site tracking.
                    </>
                  ) : (
                    "No traffic yet."
                  )}
                </p>
              </div>
              <p className="flex items-start gap-2 text-[12px] text-muted">
                <Info className="mt-0.5 size-4 shrink-0" />
                {actor.role === "admin" ? "Demo data. Counters refresh within 60 seconds in production; rollups hourly." : "Audience slices smaller than 10 people are hidden."}
              </p>
            </div>

            <Card className="p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <h2 className="text-[14px] font-medium text-muted">{metric === "views" ? "Views per day" : "Engaged hours per day"}</h2>
                <Segmented<Metric>
                  label="Metric"
                  value={metric}
                  onChange={setMetric}
                  items={[
                    { id: "views", label: "Views" },
                    { id: "engaged", label: "Engaged" },
                  ]}
                />
              </div>
              <AreaFull data={series} label={`${metric === "views" ? "Views" : "Engaged hours"} per day`} format={(n) => compact.format(n)} />
            </Card>
          </div>

          <TrafficSankey items={items} />

          <h2 className="mb-2 mt-8 text-[14px] font-medium text-muted">Articles</h2>
          <div role="table" aria-label="Article performance">
            <div role="row" className="hidden grid-cols-[minmax(0,1fr)_90px_100px_120px_90px] gap-4 border-b border-line px-2 pb-2 text-[12px] font-medium text-muted md:grid">
              <span role="columnheader">Headline</span>
              <span role="columnheader" className="text-right">Views</span>
              <span role="columnheader" className="text-right">Engaged</span>
              <span role="columnheader">Read-through</span>
              <span role="columnheader" className="text-right">First read</span>
            </div>
            {[...items].sort((a, b) => b.analytics.views - a.analytics.views).map((a) => (
              <ArticleStatsRow key={a.id} a={a} />
            ))}
          </div>
        </>
      )}

      {tab === "reviews" && <ReviewMetrics />}
      {tab === "audience" && <Audience />}
    </>
  );
}

function Big({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[13px] text-muted">{label}</p>
      <p className="mt-0.5 text-[28px] leading-tight tracking-tight sm:text-[32px]">{value}</p>
    </div>
  );
}

function ArticleStatsRow({ a }: { a: Article }) {
  return (
    <div role="row" className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 border-b border-line px-2 py-3 md:grid-cols-[minmax(0,1fr)_90px_100px_120px_90px]">
      <span role="cell" className="min-w-0">
        <span className="block truncate font-serif text-[14px] font-medium">{a.headline}</span>
        <SectionDot section={a.section} />
      </span>
      <span role="cell" className="text-right text-[14px] tabular-nums">{nf.format(a.analytics.views)}</span>
      <span role="cell" className="hidden text-right text-[14px] tabular-nums md:block">{fmtDuration(a.analytics.avgEngagedSec)}</span>
      <span role="cell" className="hidden items-center gap-2 md:flex">
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-select">
          <span className="block h-full rounded-full bg-brand" style={{ width: `${a.analytics.readThrough * 100}%` }} />
        </span>
        <span className="text-[13px] tabular-nums">{Math.round(a.analytics.readThrough * 100)}%</span>
      </span>
      <span role="cell" className="hidden text-right text-[13px] text-muted md:block">{a.analytics.publishToFirstReadSec}s</span>
    </div>
  );
}

const SOURCE_COUNT = 4;

interface SNode { name: string; color: string }

type Hover = { kind: "node"; name: string } | { kind: "link"; source: string; target: string } | null;

function linkActive(hover: Hover, source: string, target: string) {
  if (!hover) return null;
  return hover.kind === "link" ? hover.source === source && hover.target === target : hover.name === source || hover.name === target;
}

function TrafficSankey({ items }: { items: Article[] }) {
  const [hover, setHover] = useState<Hover>(null);
  const data = useMemo(() => {
    const sources = [
      { key: "direct", name: "Direct", color: "#6b6e80" },
      { key: "search", name: "Search", color: "#3c63ed" },
      { key: "social", name: "Social", color: "#aa2a78" },
      { key: "internal", name: "Internal", color: "#17703f" },
    ] as const;
    const sections = (Object.keys(SECTION_LABEL) as SectionKey[]).filter((s) => items.some((a) => a.section === s));
    const hex: Record<SectionKey, string> = { world: "#0b6e78", politics: "#b42318", business: "#17703f", tech: "#6b3fd6", sports: "#b83c0a", culture: "#aa2a78", science: "#8a5a00" };
    const colored: SNode[] = [...sources.map((s) => ({ name: s.name, color: s.color })), ...sections.map((s) => ({ name: SECTION_LABEL[s], color: hex[s] }))];
    const links: { source: number; target: number; value: number }[] = [];
    sources.forEach((src, si) =>
      sections.forEach((sec, ci) => {
        const value = items.filter((a) => a.section === sec).reduce((n, a) => n + a.analytics.source[src.key], 0);
        if (value > 0) links.push({ source: si, target: sources.length + ci, value });
      }),
    );
    return { nodes: colored, links };
  }, [items]);

  if (data.links.length === 0) return null;

  const summary = (() => {
    if (!hover) return "Hover a flow or a label to see where readers come from.";
    const rows = data.links.map((l) => ({ source: data.nodes[l.source].name, target: data.nodes[l.target].name, value: l.value }));
    if (hover.kind === "link") {
      const row = rows.find((r) => r.source === hover.source && r.target === hover.target);
      return row ? `${row.source} to ${row.target}: ${nf.format(row.value)} views` : "";
    }
    const mine = rows.filter((r) => r.source === hover.name || r.target === hover.name);
    return `${hover.name}: ${nf.format(mine.reduce((n, r) => n + r.value, 0))} views`;
  })();

  return (
    <Card className="mt-6 p-4">
      <div className="mb-2 flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
        <h2 className="text-[14px] font-medium text-muted">Traffic source to section</h2>
        <p className="text-[13px] text-ink" aria-live="polite">{summary}</p>
      </div>
      <div role="img" aria-label="Flow of views from traffic sources to sections" style={{ height: 300 }} onMouseLeave={() => setHover(null)}>
        <ResponsiveContainer width="100%" height="100%">
          <Sankey
            data={data}
            nodePadding={22}
            nodeWidth={10}
            margin={{ top: 8, right: 80, bottom: 8, left: 72 }}
            link={<SankeyLink hover={hover} onHover={setHover} />}
            node={<SankeyNode hover={hover} onHover={setHover} links={data.links} nodes={data.nodes} />}
          >
            <Tooltip formatter={(v) => nf.format(Number(v))} contentStyle={{ borderRadius: 10, border: "1px solid #e7e8ef", fontSize: 12 }} />
          </Sankey>
        </ResponsiveContainer>
      </div>
    </Card>
  );
}

interface LinkProps {
  sourceX?: number;
  targetX?: number;
  sourceY?: number;
  targetY?: number;
  sourceControlX?: number;
  targetControlX?: number;
  linkWidth?: number;
  payload?: { source: { name: string; color: string }; target: { name: string; color: string } };
  hover: Hover;
  onHover: (h: Hover) => void;
}

function SankeyLink({ sourceX = 0, targetX = 0, sourceY = 0, targetY = 0, sourceControlX = 0, targetControlX = 0, linkWidth = 0, payload, hover, onHover }: LinkProps) {
  const source = payload?.source.name ?? "";
  const target = payload?.target.name ?? "";
  const active = linkActive(hover, source, target);
  return (
    <path
      d={`M${sourceX},${sourceY} C${sourceControlX},${sourceY} ${targetControlX},${targetY} ${targetX},${targetY}`}
      fill="none"
      stroke={payload?.source.color ?? "#9aa9e8"}
      strokeWidth={linkWidth}
      strokeOpacity={active === null ? 0.28 : active ? 0.62 : 0.07}
      style={{ transition: "stroke-opacity 150ms", cursor: "pointer" }}
      onMouseEnter={() => onHover({ kind: "link", source, target })}
    />
  );
}

interface NodeProps {
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  index?: number;
  payload?: { name: string; color: string };
  hover: Hover;
  onHover: (h: Hover) => void;
  links: { source: number; target: number; value: number }[];
  nodes: SNode[];
}

function SankeyNode({ x = 0, y = 0, width = 10, height = 0, index = 0, payload, hover, onHover, links, nodes }: NodeProps) {
  const isSource = index < SOURCE_COUNT;
  const name = payload?.name ?? "";
  let dim = false;
  if (hover) {
    if (hover.kind === "node") {
      dim = hover.name !== name && !links.some((l) => (nodes[l.source].name === hover.name && nodes[l.target].name === name) || (nodes[l.target].name === hover.name && nodes[l.source].name === name));
    } else dim = hover.source !== name && hover.target !== name;
  }
  return (
    <Layer>
      <g style={{ opacity: dim ? 0.3 : 1, transition: "opacity 150ms", cursor: "pointer" }} onMouseEnter={() => onHover({ kind: "node", name })}>
        <Rectangle x={x} y={y} width={width} height={height} fill={payload?.color ?? "#3c63ed"} radius={2} />
        <text
          x={isSource ? x - 6 : x + width + 6}
          y={y + height / 2}
          textAnchor={isSource ? "end" : "start"}
          dominantBaseline="middle"
          fontSize={12}
          fontWeight={hover?.kind === "node" && hover.name === name ? 600 : 400}
          fill="#1b1d2b"
        >
          {name}
        </text>
      </g>
    </Layer>
  );
}

function ReviewMetrics() {
  const { state, actor } = useNewsroom();
  const reporters = state.staff.filter((s) => s.role === "reporter" && (actor.role === "admin" || s.editorId === actor.id));
  const verdicts = state.articles.flatMap((a) => a.verdicts.map((v) => ({ ...v, authorId: a.authorId })));
  return (
    <>
      <div className="grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
        <Big label="Time to first review" value="1h 12m" />
        <Big label="Reviewed before deadline" value={`${Math.round((state.articles.filter((a) => a.publishedVia === "approval").length / Math.max(1, state.articles.filter((a) => a.publishedVia === "approval" || a.publishedVia === "timeout").length)) * 100)}%`} />
        <Big label="Change-request rate" value={`${Math.round((verdicts.filter((v) => v.verdict === "request_changes").length / Math.max(1, verdicts.length)) * 100)}%`} />
        <Big label="Queue depth" value={String(state.articles.filter((a) => a.status === "in_review").length)} />
      </div>
      <h2 className="mb-2 mt-6 text-[14px] font-medium text-muted">Reporters</h2>
      <div role="table" aria-label="Reporter review metrics">
        <div role="row" className="hidden grid-cols-[minmax(0,1fr)_90px_110px_110px_110px] gap-4 border-b border-line px-2 pb-2 text-[12px] font-medium text-muted md:grid">
          <span role="columnheader">Reporter</span>
          <span role="columnheader" className="text-right">Published</span>
          <span role="columnheader" className="text-right">Mistake pts</span>
          <span role="columnheader" className="text-right">Changes asked</span>
          <span role="columnheader">Mode</span>
        </div>
        {reporters.map((r) => {
          const pts = state.mistakes.filter((m) => m.reporterId === r.id).reduce((n, m) => n + SEVERITY_POINTS[m.severity], 0);
          return (
            <div role="row" key={r.id} className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-2 py-3 md:grid-cols-[minmax(0,1fr)_90px_110px_110px_110px]">
              <span role="cell" className="flex items-center gap-2.5">
                <Avatar person={r} size={26} />
                <span className="text-[14px] font-medium">{r.name}</span>
              </span>
              <span role="cell" className="hidden text-right tabular-nums md:block">{state.articles.filter((a) => a.authorId === r.id && a.publishedAt).length}</span>
              <span role="cell" className="text-right tabular-nums">{pts}</span>
              <span role="cell" className="hidden text-right tabular-nums md:block">{verdicts.filter((v) => v.authorId === r.id && v.verdict === "request_changes").length}</span>
              <span role="cell" className="hidden md:block">{r.supervision === "supervised" ? <Pill tone="warn">Supervised</Pill> : <Pill tone={r.publishMode === "auto" ? "good" : "neutral"}>{r.publishMode === "auto" ? "Auto" : "Review"}</Pill>}</span>
            </div>
          );
        })}
      </div>
    </>
  );
}

interface AudienceSummary {
  consent_subjects: number;
  consent_rates: Record<string, number | null>;
  gpc_signals: number;
  readers: number;
  devices: Record<string, number>;
}

async function fetchAudience(): Promise<AudienceSummary | null> {
  const token = tokenStore.get();
  if (!token) return null;
  try {
    const res = await fetch(`${import.meta.env.VITE_API_BASE ?? ""}/api/admin/audience`, { headers: { Authorization: `Bearer ${token}` } });
    return res.ok ? await res.json() : null;
  } catch {
    return null;
  }
}

function Audience() {
  const { data: live } = useSWR("audience-summary", fetchAudience, { revalidateOnFocus: false });
  const hasLive = !!live && live.consent_subjects > 0;
  const rate = (k: string) => live?.consent_rates[k] ?? 0;
  const consent = hasLive
    ? [
        { tier: "Essential", pct: 100 },
        { tier: "Preferences", pct: rate("preferences") },
        { tier: "Analytics", pct: rate("analytics") },
        { tier: "Personalisation", pct: rate("personalization") },
      ]
    : [
        { tier: "Essential", pct: 100 },
        { tier: "Analytics", pct: 61 },
        { tier: "Personalisation", pct: 47 },
        { tier: "Notifications", pct: 22 },
      ];
  const deviceTotal = live ? Object.values(live.devices).reduce((n, v) => n + v, 0) : 0;
  const devices =
    hasLive && deviceTotal > 0
      ? Object.entries(live!.devices).map(([name, v]) => ({ name: name[0].toUpperCase() + name.slice(1), pct: Math.round((100 * v) / deviceTotal) }))
      : [
          { name: "Mobile (390 to 430)", pct: 64 },
          { name: "Tablet (768)", pct: 11 },
          { name: "Desktop (1280+)", pct: 25 },
        ];
  return (
    <>
      <div className="grid grid-cols-2 gap-4 border-y border-line py-5 sm:grid-cols-4">
        <Big label="Daily readers" value="12.4K" />
        <Big label="Weekly readers" value="48.1K" />
        <Big label="Monthly readers" value="131K" />
        <Big label="Returning" value="58%" />
      </div>
      <p className="mt-3 text-[12px] text-muted">
        {hasLive
          ? `Consent bars use live choices from ${nf.format(live!.consent_subjects)} readers${live!.gpc_signals ? ` (${nf.format(live!.gpc_signals)} sent a Global Privacy Control signal)` : ""}. Reader counts are demo values. Groups smaller than 10 are hidden.`
          : "Demo values until readers make cookie choices. Events are only collected with analytics consent."}
      </p>
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card className="p-5">
          <CardTitle>Consent by tier</CardTitle>
          <Bars rows={consent.map((c) => ({ label: c.tier, pct: c.pct }))} />
        </Card>
        <Card className="p-5">
          <CardTitle>Device and viewport</CardTitle>
          <Bars rows={devices.map((c) => ({ label: c.name, pct: c.pct }))} />
        </Card>
      </div>
    </>
  );
}

function Bars({ rows }: { rows: { label: string; pct: number }[] }) {
  return (
    <ul className="space-y-3">
      {rows.map((r) => (
        <li key={r.label}>
          <div className="mb-1 flex justify-between text-[13px]">
            <span>{r.label}</span>
            <span className="tabular-nums text-muted">{r.pct}%</span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-select">
            <div className="h-full rounded-full bg-brand" style={{ width: `${r.pct}%` }} />
          </div>
        </li>
      ))}
    </ul>
  );
}
