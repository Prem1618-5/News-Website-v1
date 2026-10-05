import type { Article, EffectiveMode, Settings, Urgency } from "./types";

export const MIN = 60_000;
export const HOUR = 60 * MIN;
export const HARD_CAP = 48 * HOUR;

export const SLA_MS: Record<Urgency, number> = {
  5: 30 * MIN,
  4: 2 * HOUR,
  3: 8 * HOUR,
  2: 24 * HOUR,
  1: 48 * HOUR,
};

/** Share of the SLA after which an unclaimed item opens to the whole editor pool. */
export const POOL_AT: Record<Urgency, number> = { 5: 0, 4: 0.5, 3: 0.75, 2: 0.75, 1: 0.9 };

export const CLAIM_LEASE_MS = (u: Urgency) => (u === 5 ? 10 * MIN : 30 * MIN);

export function dueAt(submittedAt: number, urgency: Urgency): number {
  return submittedAt + Math.min(SLA_MS[urgency], HARD_CAP);
}

export function poolOpensAt(submittedAt: number, urgency: Urgency): number {
  return submittedAt + SLA_MS[urgency] * POOL_AT[urgency];
}

export type DeadlineAction =
  | { kind: "auto_publish" }
  | { kind: "escalate"; reason: string }
  | { kind: "alert_admin"; reason: string };

export interface DeadlineInput {
  mode: EffectiveMode;
  urgency: Urgency;
  preflightPassed: boolean;
  hold: boolean;
  openBlockingThreads: number;
  settings: Pick<Settings, "autoPublishEnabled" | "timeoutPublishEnabled">;
}

/** Table-driven timeout decision (requirements section 8.4). Pure. */
export function onDeadline(i: DeadlineInput): DeadlineAction {
  if (i.mode === "supervised") return { kind: "escalate", reason: "Supervised reporter: never published without a verdict." };
  if (i.urgency >= 4) return { kind: "escalate", reason: "Urgency 4 and 5 are never auto-published." };
  if (i.hold || !i.preflightPassed) return { kind: "alert_admin", reason: i.hold ? "Held article" : "Failed pre-flight checks" };
  if (i.openBlockingThreads > 0) return { kind: "alert_admin", reason: "Open blocking comment" };
  if (!i.settings.autoPublishEnabled || !i.settings.timeoutPublishEnabled) {
    return { kind: "alert_admin", reason: "Timeout publishing is switched off" };
  }
  return { kind: "auto_publish" };
}

/** Queue order: urgency 5 pinned, then soonest deadline, then higher urgency. */
export function compareQueue(a: Article, b: Article): number {
  const a5 = a.urgency === 5 ? 0 : 1;
  const b5 = b.urgency === 5 ? 0 : 1;
  if (a5 !== b5) return a5 - b5;
  const ad = a.cycle?.dueAt ?? Infinity;
  const bd = b.cycle?.dueAt ?? Infinity;
  if (ad !== bd) return ad - bd;
  return b.urgency - a.urgency;
}

export function formatRemaining(ms: number): string {
  const over = ms < 0;
  const abs = Math.abs(ms);
  const h = Math.floor(abs / HOUR);
  const m = Math.floor((abs % HOUR) / MIN);
  const s = Math.floor((abs % MIN) / 1000);
  let text: string;
  if (h >= 1) text = `${h}h ${String(m).padStart(2, "0")}m`;
  else if (m >= 1) text = `${m}m ${String(s).padStart(2, "0")}s`;
  else text = `${s}s`;
  return over ? `${text} overdue` : text;
}
