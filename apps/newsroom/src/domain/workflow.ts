import { authorize, hasCapability, type Capability, type Resource } from "./capabilities";
import { clip, derivePreflight, diffBlocks, slugify } from "./content";
import { preflightPassed, runPreflight } from "./preflight";
import { CLAIM_LEASE_MS, dueAt, onDeadline, poolOpensAt, MIN, SLA_MS } from "./sla";
import { evaluateTrigger, type ReviewOutcome } from "./supervision";
import type {
  ActivityEntry,
  Article,
  ArticleBlock,
  AuditEntry,
  HeroMedia,
  Language,
  EffectiveMode,
  Mistake,
  MistakeCategory,
  Notice,
  PublishMode,
  Settings,
  Severity,
  Staff,
  Urgency,
  Verdict,
  SectionKey,
} from "./types";

export interface NewsroomState {
  actorId: string;
  staff: Staff[];
  articles: Article[];
  mistakes: Mistake[];
  outcomes: ReviewOutcome[];
  notices: Notice[];
  audit: AuditEntry[];
  settings: Settings;
}

export interface Out {
  state: NewsroomState;
  error?: string;
  message?: string;
}

let counter = 0;
export const uid = (p: string) => `${p}_${Date.now().toString(36)}${(counter++).toString(36)}`;

export const getStaff = (s: NewsroomState, id: string) => s.staff.find((x) => x.id === id);
export const getActor = (s: NewsroomState) => s.staff.find((x) => x.id === s.actorId)!;

/** One function decides how a person may publish. Every publish path uses it. */
export function effectiveMode(staff: Staff): EffectiveMode {
  return staff.supervision === "supervised" ? "supervised" : staff.publishMode;
}

export function canPublishDirect(actor: Staff, settings: Settings): { ok: boolean; reason?: string } {
  if (actor.role === "admin") return { ok: true };
  const mode = effectiveMode(actor);
  if (mode === "supervised") return { ok: false, reason: "You are supervised: every article needs an editor's approval." };
  if (mode === "review") return { ok: false, reason: "Your publish mode is Review: submit for an editor's approval." };
  if (!settings.autoPublishEnabled) return { ok: false, reason: "Auto-publishing is switched off newsroom-wide." };
  return { ok: true };
}

function log(
  s: NewsroomState,
  actorId: string,
  action: string,
  entity: string,
  outcome: AuditEntry["outcome"] = "ok",
  detail?: string,
): NewsroomState {
  const entry: AuditEntry = { id: uid("aud"), at: Date.now(), actorId, action, entity, outcome, detail };
  return { ...s, audit: [entry, ...s.audit].slice(0, 200) };
}

function refuse(s: NewsroomState, actor: Staff, action: string, entity: string, reason: string): Out {
  return { state: log(s, actor.id, action, entity, "denied", reason), error: reason };
}

function check(s: NewsroomState, actor: Staff, cap: Capability, res: Resource, entity: string): Out | null {
  const d = authorize(actor, cap, res);
  return d.allowed ? null : refuse(s, actor, cap, entity, d.reason ?? "Not allowed");
}

function patchArticle(s: NewsroomState, id: string, fn: (a: Article) => Article): NewsroomState {
  return { ...s, articles: s.articles.map((a) => (a.id === id ? fn(a) : a)) };
}

function activity(actorId: string, kind: ActivityEntry["kind"], summary: string, extra: Partial<ActivityEntry> = {}): ActivityEntry {
  return { id: uid("act"), at: Date.now(), actorId, kind, summary, ...extra };
}

function track(s: NewsroomState, id: string, ...entries: ActivityEntry[]): NewsroomState {
  return patchArticle(s, id, (a) => ({ ...a, activity: [...entries, ...(a.activity ?? [])].slice(0, 300) }));
}

function patchStaff(s: NewsroomState, id: string, fn: (a: Staff) => Staff): NewsroomState {
  return { ...s, staff: s.staff.map((a) => (a.id === id ? fn(a) : a)) };
}

export function switchActor(s: NewsroomState, actorId: string): NewsroomState {
  return { ...s, actorId };
}

// ---------------------------------------------------------------- articles

export interface NewArticleInput {
  headline: string;
  standfirst: string;
  section: SectionKey;
  urgency: Urgency;
  sensitivity: boolean;
  kicker?: string;
  language?: Language;
  body?: ArticleBlock[];
  tags?: string[];
  hero?: HeroMedia;
  seo?: Article["seo"];
  slug?: string;
}

export type ArticlePatch = Partial<Pick<Article, "headline" | "standfirst" | "kicker" | "section" | "urgency" | "sensitivity" | "language" | "body" | "tags" | "hero" | "seo" | "slug">>;

const FIELD_LABEL: Record<keyof ArticlePatch, string> = {
  headline: "headline", standfirst: "summary", kicker: "label", section: "section", urgency: "urgency", sensitivity: "legal flag",
  language: "language", body: "story text", tags: "tags", hero: "featured media", seo: "search settings", slug: "web address",
};

/** Who may change an article's content right now, and why not. */
export function canEditContent(s: NewsroomState, actor: Staff, a: Article): { ok: boolean; asEditor: boolean; reason?: string } {
  if (a.authorId === actor.id) {
    if (["draft", "changes_requested"].includes(a.status)) return { ok: true, asEditor: false };
    if (a.status === "in_review") return { ok: false, asEditor: false, reason: "It is with an editor now. Withdraw it to keep writing, or wait for their notes." };
    return { ok: false, asEditor: false, reason: "Live articles are changed with an update note by an editor." };
  }
  const author = getStaff(s, a.authorId);
  const decision = authorize(actor, "article.review", { article: a, author });
  if (!decision.allowed) return { ok: false, asEditor: true, reason: decision.reason };
  if (a.status !== "in_review") return { ok: false, asEditor: true, reason: "Editors can fix articles while they are waiting for review." };
  const holder = a.cycle?.claimedBy;
  if (holder && holder !== actor.id && (a.cycle?.claimExpiresAt ?? 0) > Date.now()) {
    return { ok: false, asEditor: true, reason: `${getStaff(s, holder)?.name ?? "Another editor"} is reviewing this right now.` };
  }
  return { ok: true, asEditor: true };
}

/**
 * Saves content changes. Reporters edit their own drafts; editors may fix small mistakes while
 * reviewing. Every change is recorded with who made it, so both sides can see it later.
 */
export function updateArticle(s: NewsroomState, actor: Staff, id: string, patch: ArticlePatch, opts: { quiet?: boolean } = {}): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const can = canEditContent(s, actor, a);
  if (!can.ok) return can.asEditor ? refuse(s, actor, "article.edit", `article:${id}`, can.reason!) : { state: s, error: can.reason };

  const entries: ActivityEntry[] = [];
  const kind = can.asEditor ? "editor_fix" : "edited";
  const changed: string[] = [];
  for (const key of Object.keys(patch) as (keyof ArticlePatch)[]) {
    const next = patch[key];
    const prev = a[key];
    if (JSON.stringify(next) === JSON.stringify(prev)) continue;
    changed.push(FIELD_LABEL[key]);
    if (key === "body") {
      for (const c of diffBlocks(a.body, patch.body ?? []).slice(0, 12)) {
        entries.push(activity(actor.id, kind, c.kind === "added" ? "Added text" : c.kind === "removed" ? "Removed text" : "Changed text", {
          field: "body", blockId: c.blockId, before: clip(c.before), after: clip(c.after),
        }));
      }
    } else if (typeof next === "string" || typeof next === "number" || typeof next === "boolean") {
      entries.push(activity(actor.id, kind, `Changed the ${FIELD_LABEL[key]}`, { field: key, before: clip(String(prev ?? "")), after: clip(String(next)) }));
    } else {
      entries.push(activity(actor.id, kind, `Updated the ${FIELD_LABEL[key]}`, { field: key }));
    }
  }
  if (!changed.length) return { state: s };

  const now = Date.now();
  const merged: Article = { ...a, ...patch, headline: (patch.headline ?? a.headline), updatedAt: now };
  const slugTaken = s.articles.some((x) => x.id !== id && x.slug === merged.slug);
  merged.preflight = derivePreflight(merged, slugTaken);
  merged.activity = coalesce(entries.reverse(), a.activity ?? []).slice(0, 300);

  let next = patchArticle(s, id, () => merged);
  if (can.asEditor) next = log(next, actor.id, "article.editor_fix", `article:${id}`, "ok", changed.join(", "));
  return { state: next, message: opts.quiet ? undefined : can.asEditor ? "Your fix is saved and shown to the reporter" : "Saved" };
}

const COALESCE_MS = 10 * MIN;

/**
 * Autosave runs every few seconds while someone types. Repeated saves of the same field or block
 * by the same person within a few minutes become one history line that keeps the original "before".
 */
function coalesce(fresh: ActivityEntry[], history: ActivityEntry[]): ActivityEntry[] {
  const kept = [...history];
  const out: ActivityEntry[] = [];
  for (const e of fresh) {
    const idx = kept.findIndex(
      (h) => h.actorId === e.actorId && h.kind === e.kind && h.field === e.field && h.blockId === e.blockId && e.at - h.at < COALESCE_MS,
    );
    if (idx >= 0) {
      const prev = kept.splice(idx, 1)[0];
      const summary = prev.summary === "Added text" ? prev.summary : e.summary;
      out.push({ ...e, id: prev.id, summary, before: prev.before });
    } else out.push(e);
  }
  return [...out, ...kept];
}

export function createArticle(s: NewsroomState, actor: Staff, input: NewArticleInput): Out {
  const denied = check(s, actor, "article.create", {}, "article:new");
  if (denied) return denied;
  if (!input.headline.trim()) return { state: s, error: "A headline is required." };

  if (input.urgency === 5 && actor.role === "reporter") {
    const since = Date.now() - 24 * 60 * MIN;
    const used = s.articles.filter((a) => a.authorId === actor.id && a.urgency === 5 && a.createdAt >= since).length;
    if (used >= s.settings.urgency5QuotaPer24h) {
      return refuse(s, actor, "article.create", "article:new", `You have used ${used} of ${s.settings.urgency5QuotaPer24h} breaking slots in 24 hours. Ask an editor to confirm.`);
    }
  }

  const now = Date.now();
  const id = uid("art");
  const slug = (input.slug?.trim() || slugify(input.headline) || id) + "-" + id.slice(-3);
  const draft: Article = {
    id,
    slug,
    kicker: input.kicker?.trim() ?? "",
    headline: input.headline.trim(),
    standfirst: input.standfirst.trim(),
    section: input.section,
    authorId: actor.id,
    urgency: input.urgency,
    sensitivity: input.sensitivity,
    hold: false,
    status: "draft",
    origin: "original",
    createdAt: now,
    updatedAt: now,
    preflight: { hasHero: false, heroAlt: false, heroCredit: false, hasByline: true, hasSection: true, bodyBlocks: 0, brokenMedia: false, slugUnique: true },
    threads: [],
    verdicts: [],
    analytics: emptyAnalytics(),
    language: input.language ?? "en",
    body: input.body ?? [],
    tags: input.tags ?? [],
    hero: input.hero,
    seo: input.seo,
    activity: [activity(actor.id, "created", "Started the draft")],
  };
  const article = { ...draft, preflight: derivePreflight(draft) };
  return {
    state: log({ ...s, articles: [article, ...s.articles] }, actor.id, "article.create", `article:${id}`),
    message: "Draft saved",
  };
}

export function emptyAnalytics() {
  return {
    views: 0, uniques: 0, likes: 0, saves: 0, shares: 0, avgEngagedSec: 0, readThrough: 0,
    source: { direct: 0, search: 0, social: 0, internal: 0 }, daily: new Array(30).fill(0), publishToFirstReadSec: 0,
  };
}

export function submitArticle(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const denied = check(s, actor, "article.submit", { article: a }, `article:${id}`);
  if (denied) return denied;
  if (a.status !== "draft" && a.status !== "changes_requested") return { state: s, error: "Only drafts and articles with requested changes can be submitted." };
  if (a.threads.some((t) => t.severity === "blocking" && t.status === "open")) {
    return { state: s, error: "Resolve all blocking comments before resubmitting." };
  }
  const now = Date.now();
  const author = getStaff(s, a.authorId)!;
  const prev = a.cycle?.cycleNo ?? 0;
  const cycle = {
    cycleNo: prev + 1,
    submittedAt: now,
    urgencyAtSubmit: a.urgency,
    dueAt: dueAt(now, a.urgency),
    escalationLevel: 0,
    reminderSent: false,
    poolOpen: a.urgency === 5 || (author.editorId ? false : true),
  };
  let next = patchArticle(s, id, (x) => ({ ...x, status: "in_review", cycle, updatedAt: now }));
  next = log(next, actor.id, "article.submit", `article:${id}`, "ok", `cycle ${cycle.cycleNo}, urgency ${a.urgency}`);
  next = track(next, id, activity(actor.id, "submitted", cycle.cycleNo > 1 ? "Sent back to the editor after changes" : "Sent to an editor for review"));
  return { state: next, message: a.urgency === 5 ? "Sent. Every available editor has been alerted." : "Sent to your editor for review" };
}

export function publishNow(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const denied = check(s, actor, "article.publish_direct", { article: a }, `article:${id}`);
  if (denied) return denied;
  const can = canPublishDirect(actor, s.settings);
  if (!can.ok) return refuse(s, actor, "article.publish_direct", `article:${id}`, can.reason!);
  if (a.status !== "draft" && a.status !== "approved") return { state: s, error: "Only drafts and approved articles can be published." };
  const failed = runPreflight(a).filter((c) => !c.passed);
  if (failed.length) return { state: s, error: `Not ready yet: ${failed.map((c) => (c.detail ?? c.label).toLowerCase()).join("; ")}.` };

  const now = Date.now();
  const checkNeeded = actor.role !== "admin";
  let next = patchArticle(s, id, (x) => ({
    ...x,
    status: checkNeeded ? "published_pending_check" : "published",
    publishedAt: now,
    publishedVia: "direct",
    checkDueAt: checkNeeded ? now + SLA_MS[x.urgency] : undefined,
    updatedAt: now,
  }));
  next = log(next, actor.id, "article.publish", `article:${id}`, "ok", "direct");
  next = track(next, id, activity(actor.id, "published", "Published to the website"));
  return { state: next, message: checkNeeded ? "Published. An editor will give it a quick read soon." : "Published" };
}

export function withdrawArticle(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  if (a.authorId !== actor.id && actor.role === "reporter") return refuse(s, actor, "article.withdraw", `article:${id}`, "You can only withdraw your own articles.");
  if (!["draft", "in_review", "changes_requested", "approved"].includes(a.status)) return { state: s, error: "Only unpublished articles can be withdrawn." };
  return { state: log(patchArticle(s, id, (x) => ({ ...x, status: "withdrawn", cycle: x.cycle })), actor.id, "article.withdraw", `article:${id}`), message: "Withdrawn" };
}

// ------------------------------------------------------------------ claims

export function claimArticle(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a || !a.cycle) return { state: s, error: "Nothing to claim." };
  const author = getStaff(s, a.authorId);
  const denied = check(s, actor, "article.review", { article: a, author }, `article:${id}`);
  if (denied) return denied;
  const now = Date.now();
  if (a.status !== "in_review") return { state: s, error: "This item is not waiting for review." };
  if (a.cycle.claimedBy && a.cycle.claimedBy !== actor.id && (a.cycle.claimExpiresAt ?? 0) > now) {
    return { state: s, error: `Already claimed by ${getStaff(s, a.cycle.claimedBy)?.name ?? "another editor"}.` };
  }
  const open = s.articles.filter((x) => x.cycle?.claimedBy === actor.id && x.status === "in_review" && (x.cycle.claimExpiresAt ?? 0) > now).length;
  if (open >= 8 && a.cycle.claimedBy !== actor.id) return { state: s, error: "You hold 8 claims already. Release one first." };
  const lease = now + CLAIM_LEASE_MS(a.urgency);
  const next = patchArticle(s, id, (x) => ({ ...x, cycle: { ...x.cycle!, claimedBy: actor.id, claimExpiresAt: lease } }));
  return { state: log(next, actor.id, "review.claim", `article:${id}`), message: "Claimed. Your lease renews while you work." };
}

export function releaseArticle(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a?.cycle || a.cycle.claimedBy !== actor.id) return { state: s, error: "You do not hold this claim." };
  const next = patchArticle(s, id, (x) => ({ ...x, cycle: { ...x.cycle!, claimedBy: undefined, claimExpiresAt: undefined } }));
  return { state: log(next, actor.id, "review.release", `article:${id}`), message: "Released to the queue" };
}

// ----------------------------------------------------------------- threads

export interface ThreadInput {
  blockLabel: string;
  severity: "blocking" | "advisory";
  body: string;
  blockId?: string;
  quote?: string;
}

export function addThread(s: NewsroomState, actor: Staff, id: string, input: ThreadInput): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const author = getStaff(s, a.authorId);
  const denied = check(s, actor, "article.review", { article: a, author }, `article:${id}`);
  if (denied) return denied;
  if (!input.body.trim()) return { state: s, error: "Write a comment first." };
  const now = Date.now();
  const thread = {
    id: uid("thr"),
    blockLabel: input.blockLabel || "Whole article",
    blockId: input.blockId,
    quote: input.quote?.trim() ? clip(input.quote, 200) : undefined,
    severity: input.severity,
    status: "open" as const,
    createdBy: actor.id,
    comments: [{ id: uid("cmt"), authorId: actor.id, body: input.body.trim(), at: now }],
  };
  let next = patchArticle(s, id, (x) => ({ ...x, threads: [...x.threads, thread] }));
  next = track(next, id, activity(actor.id, "commented", input.severity === "blocking" ? "Asked for a required fix" : "Left a suggestion", {
    blockId: input.blockId, before: thread.quote, after: clip(input.body),
  }));
  return { state: log(next, actor.id, "review.thread", `article:${id}`), message: "Comment added" };
}

export function replyThread(s: NewsroomState, actor: Staff, id: string, threadId: string, body: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  if (!body.trim()) return { state: s, error: "Write a reply first." };
  const involved = a.authorId === actor.id || actor.role !== "reporter";
  if (!involved) return refuse(s, actor, "review.reply", `article:${id}`, "You cannot reply on this article.");
  let next = patchArticle(s, id, (x) => ({
    ...x,
    threads: x.threads.map((t) => (t.id === threadId ? { ...t, comments: [...t.comments, { id: uid("cmt"), authorId: actor.id, body: body.trim(), at: Date.now() }] } : t)),
  }));
  next = track(next, id, activity(actor.id, "replied", "Replied to a comment", { after: clip(body) }));
  return { state: next, message: "Reply sent" };
}

export function setThreadStatus(s: NewsroomState, actor: Staff, id: string, threadId: string, status: "open" | "resolved"): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  if (a.authorId !== actor.id && actor.role === "reporter") return refuse(s, actor, "review.resolve", `article:${id}`, "You cannot resolve threads on this article.");
  let next = patchArticle(s, id, (x) => ({ ...x, threads: x.threads.map((t) => (t.id === threadId ? { ...t, status } : t)) }));
  next = track(next, id, activity(actor.id, status === "resolved" ? "resolved" : "reopened", status === "resolved" ? "Marked a comment as done" : "Reopened a comment"));
  return { state: next, message: status === "resolved" ? "Marked as done" : "Comment reopened" };
}

// ----------------------------------------------------------------- verdicts

export interface MistakeInput {
  category: MistakeCategory;
  severity: Severity;
  note: string;
}

export interface VerdictInput {
  verdict: Verdict;
  summary: string;
  mistakes: MistakeInput[];
}

export function submitVerdict(s: NewsroomState, actor: Staff, id: string, input: VerdictInput): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a || !a.cycle) return { state: s, error: "Article is not in review." };
  const author = getStaff(s, a.authorId)!;
  const denied = check(s, actor, "article.review", { article: a, author }, `article:${id}`);
  if (denied) return denied;
  if (a.status !== "in_review") return { state: s, error: "This article is not waiting for a verdict." };

  const now = Date.now();
  const holder = a.cycle.claimedBy;
  if (holder && holder !== actor.id && (a.cycle.claimExpiresAt ?? 0) > now) {
    return { state: s, error: `${getStaff(s, holder)?.name} is reviewing this item.` };
  }

  const openBlocking = a.threads.filter((t) => t.severity === "blocking" && t.status === "open").length;
  const approving = input.verdict === "approve" || input.verdict === "approve_with_notes";
  if (approving && openBlocking > 0) return { state: s, error: `${openBlocking} blocking comment${openBlocking > 1 ? "s" : ""} still open.` };
  if (input.verdict === "request_changes" && a.threads.length === 0 && input.mistakes.length === 0) {
    return { state: s, error: "Add at least one comment or mistake before requesting changes." };
  }
  if (input.verdict === "reject" && !input.summary.trim()) return { state: s, error: "A reason is required to reject." };

  const newMistakes: Mistake[] = input.mistakes.map((m) => ({
    id: uid("mis"), articleId: id, reporterId: a.authorId, category: m.category, severity: m.severity, note: m.note, at: now, countsTowardQuality: true, disputed: false,
  }));
  const outcome: ReviewOutcome = {
    articleId: id, at: now,
    minor: newMistakes.filter((m) => m.severity === "minor").length,
    major: newMistakes.filter((m) => m.severity === "major").length,
    critical: newMistakes.filter((m) => m.severity === "critical").length,
  };

  let next: NewsroomState = { ...s, mistakes: [...s.mistakes, ...newMistakes], outcomes: [...s.outcomes, outcome] };
  const record = { id: uid("vrd"), cycleNo: a.cycle.cycleNo, verdict: input.verdict, byId: actor.id, summary: input.summary.trim(), at: now };

  let message = "Verdict recorded";
  if (approving) {
    const passes = preflightPassed(a);
    next = patchArticle(next, id, (x) => ({
      ...x,
      verdicts: [...x.verdicts, record],
      status: passes ? "published" : "approved",
      publishedAt: passes ? now : x.publishedAt,
      publishedVia: passes ? "approval" : x.publishedVia,
      cycle: { ...x.cycle!, claimedBy: undefined, claimExpiresAt: undefined },
      updatedAt: now,
    }));
    message = passes ? "Approved and published" : "Approved, but pre-flight checks block publishing";
  } else if (input.verdict === "request_changes") {
    next = patchArticle(next, id, (x) => ({ ...x, verdicts: [...x.verdicts, record], status: "changes_requested", cycle: { ...x.cycle!, claimedBy: undefined, claimExpiresAt: undefined }, updatedAt: now }));
    message = "Changes requested. The SLA clock is stopped.";
  } else {
    next = patchArticle(next, id, (x) => ({ ...x, verdicts: [...x.verdicts, record], status: "rejected", cycle: { ...x.cycle!, claimedBy: undefined, claimExpiresAt: undefined }, updatedAt: now }));
    message = "Rejected";
  }
  next = log(next, actor.id, `review.${input.verdict}`, `article:${id}`, "ok", `${newMistakes.length} mistakes tagged`);
  const decisionText: Record<Verdict, string> = {
    approve: "Approved the article", approve_with_notes: "Approved with notes", request_changes: "Sent back with requested edits", reject: "Declined the article",
  };
  next = track(next, id, activity(actor.id, "decision", decisionText[input.verdict], { after: input.summary.trim() ? clip(input.summary) : undefined }));

  const reporter = getStaff(next, a.authorId)!;
  if (reporter.role === "reporter" && reporter.supervision === "none") {
    const t = evaluateTrigger(next.mistakes, reporter.id, now);
    if (t.triggered) {
      next = enterSupervisionInternal(next, reporter.id, `Automatic: ${t.reasons.join("; ")}`, "system");
      message += `. ${reporter.name} is now supervised.`;
    }
  }
  return { state: next, message };
}

function enterSupervisionInternal(s: NewsroomState, reporterId: string, reason: string, byId: string): NewsroomState {
  const now = Date.now();
  let next = patchStaff(s, reporterId, (r) => ({ ...r, supervision: "supervised", supervisionReason: reason, supervisedAt: now }));
  // In-flight post-publication checks become immediate reviews.
  next = {
    ...next,
    articles: next.articles.map((a) => (a.authorId === reporterId && a.status === "published_pending_check" ? { ...a, checkDueAt: now } : a)),
  };
  next = {
    ...next,
    notices: [{ id: uid("not"), kind: "notice", fromId: byId, toId: reporterId, body: `You have been placed in supervision. ${reason}`, at: now }, ...next.notices],
  };
  return log(next, byId, "supervision.enter", `staff:${reporterId}`, "ok", reason);
}

// ------------------------------------------------------------ team actions

export function setPublishMode(s: NewsroomState, actor: Staff, targetId: string, mode: PublishMode): Out {
  const target = getStaff(s, targetId);
  if (!target) return { state: s, error: "Person not found." };
  const denied = check(s, actor, "reporter.set_mode", { target }, `staff:${targetId}`);
  if (denied) return denied;
  if (mode === "auto" && target.supervision === "supervised") return refuse(s, actor, "reporter.set_mode", `staff:${targetId}`, "Auto is locked while a reporter is supervised.");
  const next = patchStaff(s, targetId, (t) => ({ ...t, publishMode: mode }));
  return { state: log(next, actor.id, "reporter.set_mode", `staff:${targetId}`, "ok", mode), message: `${target.name} is now in ${mode} mode` };
}

export function enterSupervision(s: NewsroomState, actor: Staff, targetId: string, reason: string): Out {
  const target = getStaff(s, targetId);
  if (!target) return { state: s, error: "Person not found." };
  const denied = check(s, actor, "supervision.manage", { target }, `staff:${targetId}`);
  if (denied) return denied;
  if (!reason.trim()) return { state: s, error: "A reason is required." };
  if (target.supervision === "supervised") return { state: s, error: "Already supervised." };
  return { state: enterSupervisionInternal(s, targetId, reason.trim(), actor.id), message: `${target.name} is now supervised` };
}

export function liftSupervision(s: NewsroomState, actor: Staff, targetId: string, note: string): Out {
  const target = getStaff(s, targetId);
  if (!target) return { state: s, error: "Person not found." };
  const denied = check(s, actor, "supervision.manage", { target }, `staff:${targetId}`);
  if (denied) return denied;
  if (!note.trim()) return { state: s, error: "A note is required to lift supervision." };
  const now = Date.now();
  let next = patchStaff(s, targetId, (t) => ({ ...t, supervision: "none", supervisionReason: undefined, publishMode: "review", liftedAt: now }));
  next = { ...next, notices: [{ id: uid("not"), kind: "notice", fromId: actor.id, toId: targetId, body: `Supervision lifted: ${note.trim()} You are in review mode; auto is a separate decision.`, at: now }, ...next.notices] };
  return { state: log(next, actor.id, "supervision.lift", `staff:${targetId}`, "ok", note), message: `Supervision lifted for ${target.name}` };
}

export function issueNotice(s: NewsroomState, actor: Staff, targetId: string, kind: Notice["kind"], body: string): Out {
  const target = getStaff(s, targetId);
  if (!target) return { state: s, error: "Person not found." };
  const cap: Capability = kind === "notice" ? "notice.issue" : "discipline.issue";
  const denied = check(s, actor, cap, { target }, `staff:${targetId}`);
  if (denied) return denied;
  if (!body.trim()) return { state: s, error: "Write the message first." };
  const next: NewsroomState = { ...s, notices: [{ id: uid("not"), kind, fromId: actor.id, toId: targetId, body: body.trim(), at: Date.now() }, ...s.notices] };
  return { state: log(next, actor.id, `discipline.${kind}`, `staff:${targetId}`), message: `${kind[0].toUpperCase()}${kind.slice(1)} sent to ${target.name}` };
}

export function inviteStaff(s: NewsroomState, actor: Staff, input: { name: string; email: string; role: "reporter" | "editor"; editorId?: string }): Out {
  const denied = check(s, actor, "team.manage", {}, "staff:new");
  if (denied) return denied;
  if (!input.name.trim() || !/^\S+@\S+\.\S+$/.test(input.email)) return { state: s, error: "Enter a name and a valid email." };
  if (s.staff.some((x) => x.email.toLowerCase() === input.email.toLowerCase())) return { state: s, error: "That email already has an account." };
  const now = Date.now();
  const person: Staff = {
    id: uid("stf"), name: input.name.trim(), email: input.email.trim(), role: input.role, status: "invited",
    jobTitle: input.role === "editor" ? "Editor" : "Reporter",
    editorId: input.role === "reporter" ? input.editorId : undefined,
    publishMode: "review", supervision: "none", presence: "off_shift", mfa: false, lastActiveAt: now, createdAt: now,
  };
  return { state: log({ ...s, staff: [...s.staff, person] }, actor.id, "team.invite", `staff:${person.id}`, "ok", "72h one-time invite"), message: `Invite sent to ${person.email}. It expires in 72 hours.` };
}

export function assignEditor(s: NewsroomState, actor: Staff, reporterId: string, editorId: string): Out {
  const denied = check(s, actor, "team.manage", {}, `staff:${reporterId}`);
  if (denied) return denied;
  const next = patchStaff(s, reporterId, (r) => ({ ...r, editorId }));
  return { state: log(next, actor.id, "team.assign", `staff:${reporterId}`, "ok", editorId), message: "Editor assigned" };
}

export function setPresence(s: NewsroomState, actor: Staff, presence: Staff["presence"]): Out {
  return { state: patchStaff(s, actor.id, (x) => ({ ...x, presence, lastActiveAt: Date.now() })), message: `You are ${presence.replace("_", " ")}` };
}

// ---------------------------------------------------------- article actions

export function setUrgency(s: NewsroomState, actor: Staff, id: string, urgency: Urgency): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const denied = check(s, actor, "article.set_urgency", { article: a }, `article:${id}`);
  if (denied) return denied;
  const next = patchArticle(s, id, (x) => ({
    ...x, urgency,
    cycle: x.cycle ? { ...x.cycle, dueAt: dueAt(x.cycle.submittedAt, urgency), poolOpen: x.cycle.poolOpen || urgency === 5 } : x.cycle,
  }));
  return { state: log(next, actor.id, "article.urgency", `article:${id}`, "ok", `${a.urgency} to ${urgency}`), message: `Urgency set to ${urgency}` };
}

export function toggleHold(s: NewsroomState, actor: Staff, id: string, note: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const denied = check(s, actor, "article.hold", { article: a }, `article:${id}`);
  if (denied) return denied;
  if (!note.trim()) return { state: s, error: "A note is required." };
  let next = patchArticle(s, id, (x) => ({ ...x, hold: !x.hold, holdNote: !x.hold ? note.trim() : undefined }));
  next = track(next, id, activity(actor.id, a.hold ? "resumed" : "paused", a.hold ? "Allowed publishing again" : "Paused publishing", { after: clip(note) }));
  return {
    state: log(next, actor.id, a.hold ? "article.unhold" : "article.hold", `article:${id}`, "ok", note),
    message: a.hold ? "Publishing allowed again" : "Paused. It will not go live until you resume it.",
  };
}

export function takedownArticle(s: NewsroomState, actor: Staff, id: string, reason: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  const author = getStaff(s, a.authorId);
  const denied = check(s, actor, "article.takedown", { article: a, author }, `article:${id}`);
  if (denied) return denied;
  if (!reason.trim()) return { state: s, error: "A reason is required." };
  if (!a.publishedAt || a.status === "unpublished") return { state: s, error: "Only published articles can be taken down." };
  let next = patchArticle(s, id, (x) => ({ ...x, status: "unpublished", takedown: { byId: actor.id, reason: reason.trim(), at: Date.now() } }));
  next = track(next, id, activity(actor.id, "removed", "Removed from the website", { after: clip(reason) }));
  return { state: log(next, actor.id, "article.takedown", `article:${id}`, "ok", reason), message: "Removed from the website. It disappears for readers within a minute." };
}

export function restoreArticle(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a?.takedown) return { state: s, error: "Nothing to restore." };
  const by = getStaff(s, a.takedown.byId);
  if (by && by.id !== actor.id && actor.role !== "admin") return refuse(s, actor, "article.restore", `article:${id}`, "Only the person who took this down, or higher, can restore it.");
  let next = patchArticle(s, id, (x) => ({ ...x, status: "published", takedown: undefined }));
  next = track(next, id, activity(actor.id, "restored", "Put back on the website"));
  return { state: log(next, actor.id, "article.restore", `article:${id}`), message: "Back on the website" };
}

export function completeCheck(s: NewsroomState, actor: Staff, id: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a || a.status !== "published_pending_check") return { state: s, error: "No check is pending." };
  const author = getStaff(s, a.authorId);
  const denied = check(s, actor, "article.review", { article: a, author }, `article:${id}`);
  if (denied) return denied;
  const next = patchArticle(s, id, (x) => ({ ...x, status: "published", checkDoneAt: Date.now() }));
  return { state: log(next, actor.id, "check.complete", `article:${id}`), message: "Post-publication check complete" };
}

export function breakGlassPublish(s: NewsroomState, actor: Staff, id: string, reason: string): Out {
  const a = s.articles.find((x) => x.id === id);
  if (!a) return { state: s, error: "Article not found." };
  if (actor.role !== "admin") return refuse(s, actor, "break_glass", `article:${id}`, "Only an admin can publish without review.");
  if (reason.trim().length < 10) return { state: s, error: "Explain why in at least 10 characters." };
  if (!["in_review", "changes_requested", "approved"].includes(a.status) || a.takedown) return { state: s, error: "Only an article waiting on review can be published this way." };
  if (!preflightPassed(a)) return { state: s, error: "Pre-flight checks block publishing, even in an emergency. Fix them first." };
  const now = Date.now();
  let next = patchArticle(s, id, (x) => ({ ...x, status: "published", publishedAt: now, publishedVia: "admin_override", cycle: x.cycle ? { ...x.cycle, claimedBy: undefined } : x.cycle }));
  next = track(next, id, activity(actor.id, "published", "Published without editor review (emergency)", { after: clip(reason) }));
  return { state: log(next, actor.id, "break_glass.publish", `article:${id}`, "break_glass", reason), message: "Published. Other admins have been told." };
}

export function setSetting(s: NewsroomState, actor: Staff, key: keyof Settings, value: boolean | number, reason: string): Out {
  const denied = check(s, actor, "flags.write", {}, `setting:${key}`);
  if (denied) return denied;
  if (!reason.trim()) return { state: s, error: "A reason is required for production changes." };
  const next = { ...s, settings: { ...s.settings, [key]: value } };
  return { state: log(next, actor.id, "flag.change", `setting:${key}`, "ok", `${value}: ${reason}`), message: "Setting updated" };
}

// -------------------------------------------------------------------- tick

/** Idempotent. Derives everything from timestamps, so a sleeping host catches up on the next call. */
export function tick(s: NewsroomState, now = Date.now()): NewsroomState {
  let next = s;
  for (const a of s.articles) {
    if (a.status !== "in_review" || !a.cycle) continue;
    let cycle = a.cycle;
    if (cycle.claimedBy && (cycle.claimExpiresAt ?? 0) <= now) cycle = { ...cycle, claimedBy: undefined, claimExpiresAt: undefined };
    if (!cycle.poolOpen && now >= poolOpensAt(cycle.submittedAt, cycle.urgencyAtSubmit)) cycle = { ...cycle, poolOpen: true };
    if (cycle !== a.cycle) next = patchArticle(next, a.id, (x) => ({ ...x, cycle }));

    if (now >= cycle.dueAt && cycle.escalationLevel === 0) {
      const author = getStaff(next, a.authorId)!;
      const action = onDeadline({
        mode: effectiveMode(author),
        urgency: a.urgency,
        preflightPassed: preflightPassed(a),
        hold: a.hold,
        openBlockingThreads: a.threads.filter((t) => t.severity === "blocking" && t.status === "open").length,
        settings: next.settings,
      });
      if (action.kind === "auto_publish") {
        next = patchArticle(next, a.id, (x) => ({
          ...x, status: "published_pending_check", publishedAt: now, publishedVia: "timeout", checkDueAt: now + SLA_MS[x.urgency],
          cycle: { ...cycle, escalationLevel: 1 },
        }));
        next = log(next, "system", "article.publish", `article:${a.id}`, "ok", "published on timeout");
      } else {
        next = patchArticle(next, a.id, (x) => ({ ...x, cycle: { ...cycle, escalationLevel: 1, poolOpen: true } }));
        next = log(next, "system", "sla.escalate", `article:${a.id}`, "ok", action.reason);
      }
    }
  }
  return next;
}

export { hasCapability };
