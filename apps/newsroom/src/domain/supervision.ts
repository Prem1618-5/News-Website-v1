import { SEVERITY_POINTS, type Mistake, type Staff } from "./types";

const DAY = 24 * 60 * 60 * 1000;

export const SUPERVISION_RULES = {
  windowDays: 30,
  countedMistakes: 3,
  distinctArticles: 2,
  majorCount: 2,
  criticalCount: 1,
  improvement: { cleanArticles: 5, maxMinor: 1, minDaysServed: 7 },
} as const;

export interface TriggerResult {
  triggered: boolean;
  reasons: string[];
  counted: Mistake[];
  points: number;
}

/** Mistakes in the last 30 days that count; disputed ones are excluded until resolved. */
export function countedMistakes(mistakes: Mistake[], reporterId: string, now: number): Mistake[] {
  const since = now - SUPERVISION_RULES.windowDays * DAY;
  return mistakes.filter((m) => m.reporterId === reporterId && m.at >= since && m.countsTowardQuality && !m.disputed);
}

export function evaluateTrigger(mistakes: Mistake[], reporterId: string, now: number): TriggerResult {
  const counted = countedMistakes(mistakes, reporterId, now);
  const reasons: string[] = [];
  const articles = new Set(counted.map((m) => m.articleId));
  const majors = counted.filter((m) => m.severity === "major").length;
  const criticals = counted.filter((m) => m.severity === "critical").length;

  if (counted.length >= SUPERVISION_RULES.countedMistakes && articles.size >= SUPERVISION_RULES.distinctArticles) {
    reasons.push(`${counted.length} counted mistakes across ${articles.size} articles`);
  }
  if (majors >= SUPERVISION_RULES.majorCount) reasons.push(`${majors} major mistakes`);
  if (criticals >= SUPERVISION_RULES.criticalCount) reasons.push(`${criticals} critical mistake${criticals > 1 ? "s" : ""}`);

  return {
    triggered: reasons.length > 0,
    reasons,
    counted,
    points: counted.reduce((n, m) => n + SEVERITY_POINTS[m.severity], 0),
  };
}

export interface ReviewOutcome {
  articleId: string;
  at: number;
  minor: number;
  major: number;
  critical: number;
}

export interface ImprovementSignal {
  ready: boolean;
  cleanStreak: number;
  needed: number;
  daysServed: number;
  daysNeeded: number;
}

/** A suggestion for the editor. The system never lifts supervision on its own. */
export function improvementSignal(outcomes: ReviewOutcome[], reporter: Staff, now: number): ImprovementSignal {
  const rule = SUPERVISION_RULES.improvement;
  const since = reporter.supervisedAt ?? 0;
  const after = outcomes.filter((o) => o.at >= since).sort((a, b) => b.at - a.at);
  const recent = after.slice(0, rule.cleanArticles);
  let cleanStreak = 0;
  for (const o of after) {
    if (o.major === 0 && o.critical === 0) cleanStreak += 1;
    else break;
  }
  const minorTotal = recent.reduce((n, o) => n + o.minor, 0);
  const daysServed = since ? Math.floor((now - since) / DAY) : 0;
  const ready =
    recent.length >= rule.cleanArticles &&
    cleanStreak >= rule.cleanArticles &&
    minorTotal <= rule.maxMinor &&
    daysServed >= rule.minDaysServed;
  return { ready, cleanStreak: Math.min(cleanStreak, rule.cleanArticles), needed: rule.cleanArticles, daysServed, daysNeeded: rule.minDaysServed };
}
