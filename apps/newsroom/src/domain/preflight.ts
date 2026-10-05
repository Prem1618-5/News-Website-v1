import type { Article } from "./types";

export interface PreflightCheck {
  id: string;
  label: string;
  passed: boolean;
  detail?: string;
}

/** Runs on every publish path: direct, approval, timeout and scheduled. */
export function runPreflight(a: Pick<Article, "headline" | "preflight" | "threads" | "hold" | "holdNote">): PreflightCheck[] {
  const p = a.preflight;
  const openBlocking = a.threads.filter((t) => t.severity === "blocking" && t.status === "open").length;
  return [
    { id: "headline", label: "Has a headline", passed: a.headline.trim().length > 0 },
    {
      id: "hero",
      label: "Featured photo has a description and credit",
      passed: p.hasHero && p.heroAlt && p.heroCredit,
      detail: !p.hasHero ? "Add a featured photo or video" : !p.heroAlt ? "Describe the photo" : !p.heroCredit ? "Add who took it" : undefined,
    },
    { id: "section", label: "Section chosen", passed: p.hasSection },
    { id: "byline", label: "Author name shown", passed: p.hasByline },
    { id: "body", label: "Story has text", passed: p.bodyBlocks > 0, detail: p.bodyBlocks === 0 ? "Write at least one paragraph" : undefined },
    { id: "media", label: "Every photo and video has a file", passed: !p.brokenMedia, detail: p.brokenMedia ? "Remove or fill the empty media box" : undefined },
    { id: "threads", label: "Required fixes are done", passed: openBlocking === 0, detail: openBlocking ? `${openBlocking} still open` : undefined },
    { id: "hold", label: "Publishing is not paused", passed: !a.hold, detail: a.hold ? a.holdNote : undefined },
    { id: "slug", label: "Web address is unique", passed: p.slugUnique },
  ];
}

export function preflightPassed(a: Pick<Article, "headline" | "preflight" | "threads" | "hold" | "holdNote">): boolean {
  return runPreflight(a).every((c) => c.passed);
}
