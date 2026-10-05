import { describe, expect, it } from "vitest";
import { seedState } from "@/data/seed";
import { authorize } from "./capabilities";
import { dueAt, HOUR, MIN, onDeadline } from "./sla";
import { evaluateTrigger } from "./supervision";
import {
  breakGlassPublish, canPublishDirect, claimArticle, effectiveMode, enterSupervision, getStaff, liftSupervision,
  publishNow, setPublishMode, submitVerdict, tick,
} from "./workflow";

const st = () => seedState();
const who = (s: ReturnType<typeof st>, id: string) => getStaff(s, id)!;

describe("effective mode", () => {
  it("supervision overrides auto", () => {
    const s = st();
    const alice = { ...who(s, "alice"), supervision: "supervised" as const };
    expect(alice.publishMode).toBe("auto");
    expect(effectiveMode(alice)).toBe("supervised");
    expect(canPublishDirect(alice, s.settings).ok).toBe(false);
  });

  it("a supervised reporter cannot publish directly", () => {
    const s = st();
    const out = publishNow(s, who(s, "carry"), "a2");
    expect(out.error).toBeTruthy();
    expect(out.state.articles.find((a) => a.id === "a2")!.status).toBe("in_review");
  });
});

describe("SLA", () => {
  it("applies the 48h hard cap and urgency table", () => {
    expect(dueAt(0, 5)).toBe(30 * MIN);
    expect(dueAt(0, 1)).toBe(48 * HOUR);
  });

  it.each([
    ["supervised", 1, "escalate"],
    ["review", 5, "escalate"],
    ["review", 4, "escalate"],
    ["review", 3, "auto_publish"],
    ["review", 1, "auto_publish"],
    ["auto", 2, "auto_publish"],
  ] as const)("timeout for %s mode at urgency %i is %s", (mode, urgency, kind) => {
    const a = onDeadline({ mode, urgency, preflightPassed: true, hold: false, openBlockingThreads: 0, settings: { autoPublishEnabled: true, timeoutPublishEnabled: true } });
    expect(a.kind).toBe(kind);
  });

  it("never auto-publishes when held, failing pre-flight, blocked, or the kill switch is off", () => {
    const base = { mode: "review", urgency: 2, preflightPassed: true, hold: false, openBlockingThreads: 0, settings: { autoPublishEnabled: true, timeoutPublishEnabled: true } } as const;
    expect(onDeadline({ ...base, hold: true }).kind).toBe("alert_admin");
    expect(onDeadline({ ...base, preflightPassed: false }).kind).toBe("alert_admin");
    expect(onDeadline({ ...base, openBlockingThreads: 1 }).kind).toBe("alert_admin");
    expect(onDeadline({ ...base, settings: { autoPublishEnabled: true, timeoutPublishEnabled: false } }).kind).toBe("alert_admin");
  });

  it("tick publishes an eligible overdue item on timeout and never a supervised one", () => {
    const s = st();
    const future = Date.now() + 5 * HOUR;
    const next = tick(s, future);
    expect(next.articles.find((a) => a.id === "a5")!.publishedVia).toBe("timeout");
    expect(next.articles.find((a) => a.id === "a2")!.status).toBe("in_review");
    expect(tick(next, future)).toEqual(next);
  });
});

describe("authorization", () => {
  it("blocks self-review (four eyes)", () => {
    const s = st();
    const d = authorize(who(s, "mary"), "article.review", { article: { ...s.articles[0], authorId: "mary" } });
    expect(d.allowed).toBe(false);
  });

  it("reporters cannot review or see the queue", () => {
    const s = st();
    expect(authorize(who(s, "alice"), "review.queue").allowed).toBe(false);
  });

  it("editors can only manage their assigned reporters", () => {
    const s = st();
    expect(authorize(who(s, "mary"), "supervision.manage", { target: who(s, "anthony") }).allowed).toBe(true);
    expect(authorize(who(s, "mary"), "supervision.manage", { target: who(s, "dave") }).allowed).toBe(false);
  });

  it("only admins can break glass, and need a reason", () => {
    const s = st();
    expect(breakGlassPublish(s, who(s, "mary"), "a3", "because").error).toBeTruthy();
    expect(breakGlassPublish(s, who(s, "jane"), "a3", "short").error).toBeTruthy();
    const ok = breakGlassPublish(s, who(s, "jane"), "a3", "Court order requires publication");
    expect(ok.state.articles.find((a) => a.id === "a3")!.publishedVia).toBe("admin_override");
    expect(ok.state.audit[0].outcome).toBe("break_glass");
  });
});

describe("supervision", () => {
  it("triggers on one critical mistake", () => {
    const s = st();
    const out = submitVerdict(claimArticle(s, who(s, "priya"), "a3").state, who(s, "priya"), "a3", {
      verdict: "reject", summary: "Fabricated quote", mistakes: [{ category: "Fabrication", severity: "critical", note: "Invented quote" }],
    });
    // a3 belongs to anthony (editor mary, backup landon); priya is neither and the pool is still closed.
    expect(out.error).toBeTruthy();
    const mary = submitVerdict(s, who(s, "mary"), "a3", {
      verdict: "reject", summary: "Fabricated quote", mistakes: [{ category: "Fabrication", severity: "critical", note: "Invented quote" }],
    });
    expect(getStaff(mary.state, "anthony")!.supervision).toBe("supervised");
  });

  it("locks auto while supervised and only lifts with a note, returning to review", () => {
    let s = st();
    expect(setPublishMode(s, who(s, "mary"), "carry", "auto").error).toBeTruthy();
    expect(liftSupervision(s, who(s, "mary"), "carry", "").error).toBeTruthy();
    s = liftSupervision(s, who(s, "mary"), "carry", "Five clean reviews").state;
    const carry = getStaff(s, "carry")!;
    expect(carry.supervision).toBe("none");
    expect(carry.publishMode).toBe("review");
  });

  it("evaluates the 30 day window and excludes disputed mistakes", () => {
    const s = st();
    expect(evaluateTrigger(s.mistakes, "carry", Date.now()).triggered).toBe(true);
    const disputed = s.mistakes.map((m) => ({ ...m, disputed: true }));
    expect(evaluateTrigger(disputed, "carry", Date.now()).triggered).toBe(false);
  });

  it("hierarchy: editors cannot supervise an admin or peer", () => {
    const s = st();
    expect(enterSupervision(s, who(s, "mary"), "landon", "x").error).toBeTruthy();
    expect(enterSupervision(s, who(s, "mary"), "jane", "x").error).toBeTruthy();
  });
});
