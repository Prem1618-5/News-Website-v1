import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useNewsroom } from "@/state/store";
import type { Article } from "@/domain/types";

export const PRESENCE_DOT = { available: "bg-good", busy: "bg-warn", away: "bg-faint", off_shift: "bg-faint" } as const;

export function Greeting() {
  const { actor } = useNewsroom();
  const h = new Date().getHours();
  const part = h < 12 ? "morning" : h < 18 ? "afternoon" : "evening";
  return (
    <h1 className="mb-5 text-[28px] font-normal leading-tight tracking-tight">
      Good {part}, {actor.name.split(" ")[0]}
    </h1>
  );
}

const pillCls =
  "inline-flex h-9 items-center gap-2 rounded-full border border-line bg-white px-4 text-[14px] font-medium text-ink transition-colors hover:bg-wash";

export function ActionPill({ icon, children, to, onClick }: { icon: ReactNode; children: ReactNode; to?: string; onClick?: () => void }) {
  if (to)
    return (
      <Link to={to} className={pillCls}>
        {icon}
        {children}
      </Link>
    );
  return (
    <button onClick={onClick} className={pillCls}>
      {icon}
      {children}
    </button>
  );
}

/** Demo series: 24 hourly points ending at the live queue depth. */
export function queueDepthSeries(current: number): { x: string; y: number }[] {
  const out: { x: string; y: number }[] = [];
  let seed = 7;
  for (let i = 23; i >= 0; i--) {
    seed = (seed * 9301 + 49297) % 233280;
    const wave = Math.sin((24 - i) / 3.2) * 1.8 + 3;
    const y = i === 0 ? current : Math.max(0, Math.round(wave + (seed / 233280) * 2));
    out.push({ x: i === 0 ? "now" : `${i}h ago`, y });
  }
  return out;
}

export function slaCompliance(articles: Article[]): number {
  const week = Date.now() - 7 * 86_400_000;
  const done = articles.filter((a) => a.publishedAt && a.publishedAt >= week && (a.publishedVia === "approval" || a.publishedVia === "timeout"));
  if (!done.length) return 100;
  return Math.round((done.filter((a) => a.publishedVia === "approval").length / done.length) * 100);
}
