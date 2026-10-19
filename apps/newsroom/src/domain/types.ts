export type Role = "reporter" | "editor" | "admin";
export type PublishMode = "review" | "auto";
export type EffectiveMode = "auto" | "review" | "supervised";
export type Presence = "available" | "busy" | "away" | "off_shift";
export type StaffStatus = "invited" | "active" | "suspended" | "deactivated";
export type Urgency = 1 | 2 | 3 | 4 | 5;

import { SECTIONS, type SectionKey } from "@news/contracts";

export type { SectionKey };

export type ArticleStatus =
  | "draft"
  | "in_review"
  | "changes_requested"
  | "approved"
  | "scheduled"
  | "published_pending_check"
  | "published"
  | "rejected"
  | "unpublished"
  | "withdrawn"
  | "archived";

export type PublishedVia = "direct" | "approval" | "timeout" | "admin_override";
export type Verdict = "approve" | "approve_with_notes" | "request_changes" | "reject";
export type Severity = "minor" | "major" | "critical";

export const SEVERITY_POINTS: Record<Severity, number> = { minor: 1, major: 3, critical: 6 };

export const MISTAKE_CATEGORIES = [
  "Factual accuracy",
  "Sourcing / attribution",
  "Legal / defamation risk",
  "Plagiarism / copied text",
  "Fabrication",
  "Headline accuracy",
  "Context / balance",
  "Style / grammar",
  "Media & credits",
  "Process",
] as const;
export type MistakeCategory = (typeof MISTAKE_CATEGORIES)[number];

export interface Staff {
  id: string;
  name: string;
  email: string;
  role: Role;
  status: StaffStatus;
  jobTitle: string;
  editorId?: string;
  backupEditorId?: string;
  publishMode: PublishMode;
  supervision: "none" | "supervised";
  supervisionReason?: string;
  supervisedAt?: number;
  liftedAt?: number;
  presence: Presence;
  mfa: boolean;
  lastActiveAt: number;
  createdAt: number;
}

export interface Preflight {
  hasHero: boolean;
  heroAlt: boolean;
  heroCredit: boolean;
  hasByline: boolean;
  hasSection: boolean;
  bodyBlocks: number;
  brokenMedia: boolean;
  slugUnique: boolean;
}

export interface Comment {
  id: string;
  authorId: string;
  body: string;
  at: number;
}

export interface Thread {
  id: string;
  blockLabel: string;
  /** BlockNote block id the comment is anchored to. */
  blockId?: string;
  /** The exact words the reviewer highlighted. */
  quote?: string;
  severity: "blocking" | "advisory";
  status: "open" | "resolved";
  createdBy: string;
  comments: Comment[];
}

export type Language = "en" | "hi";

/** A BlockNote JSON block. Stored as-is; HTML is never stored. */
export interface ArticleBlock {
  id?: string;
  type: string;
  props?: Record<string, unknown>;
  content?: unknown;
  children?: ArticleBlock[];
}

export interface HeroMedia {
  kind: "image" | "video";
  url: string;
  name?: string;
  posterUrl?: string;
  alt: string;
  credit: string;
  caption?: string;
  width?: number;
  height?: number;
  durationSec?: number;
  sizeBytes?: number;
}

export type ActivityKind =
  | "created"
  | "edited"
  | "editor_fix"
  | "commented"
  | "replied"
  | "resolved"
  | "reopened"
  | "submitted"
  | "decision"
  | "published"
  | "paused"
  | "resumed"
  | "removed"
  | "restored";

/** One line in an article's change history. Always says who did what. */
export interface ActivityEntry {
  id: string;
  at: number;
  actorId: string;
  kind: ActivityKind;
  summary: string;
  field?: string;
  before?: string;
  after?: string;
  blockId?: string;
}

export interface ReviewCycle {
  cycleNo: number;
  submittedAt: number;
  urgencyAtSubmit: Urgency;
  dueAt: number;
  claimedBy?: string;
  claimExpiresAt?: number;
  escalationLevel: number;
  reminderSent: boolean;
  poolOpen: boolean;
}

export interface Article {
  id: string;
  slug: string;
  kicker: string;
  headline: string;
  standfirst: string;
  section: SectionKey;
  authorId: string;
  urgency: Urgency;
  sensitivity: boolean;
  hold: boolean;
  holdNote?: string;
  status: ArticleStatus;
  origin: "original" | "wire" | "demo";
  createdAt: number;
  updatedAt: number;
  publishedAt?: number;
  publishedVia?: PublishedVia;
  preflight: Preflight;
  cycle?: ReviewCycle;
  threads: Thread[];
  verdicts: VerdictRecord[];
  checkDueAt?: number;
  checkDoneAt?: number;
  takedown?: { byId: string; reason: string; at: number };
  analytics: ArticleAnalytics;
  language: Language;
  body: ArticleBlock[];
  tags: string[];
  hero?: HeroMedia;
  seo?: { title?: string; description?: string };
  activity: ActivityEntry[];
}

export interface VerdictRecord {
  id: string;
  cycleNo: number;
  verdict: Verdict;
  byId: string;
  summary: string;
  at: number;
}

export interface Mistake {
  id: string;
  articleId: string;
  reporterId: string;
  category: MistakeCategory;
  severity: Severity;
  note: string;
  at: number;
  countsTowardQuality: boolean;
  disputed: boolean;
}

export interface ArticleAnalytics {
  views: number;
  uniques: number;
  likes: number;
  saves: number;
  shares: number;
  avgEngagedSec: number;
  readThrough: number;
  source: { direct: number; search: number; social: number; internal: number };
  daily: number[];
  publishToFirstReadSec: number;
}

export interface Notice {
  id: string;
  kind: "notice" | "warning" | "strike";
  fromId: string;
  toId: string;
  body: string;
  at: number;
  ackAt?: number;
}

export interface AuditEntry {
  id: string;
  at: number;
  actorId: string;
  action: string;
  entity: string;
  outcome: "ok" | "denied" | "break_glass";
  detail?: string;
}

export interface Settings {
  autoPublishEnabled: boolean;
  timeoutPublishEnabled: boolean;
  urgency5QuotaPer24h: number;
}

/** Sections come from the shared contract so the Newsroom, Reader and API always agree. */
export const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.key, s.en])) as Record<SectionKey, string>;

export const SECTION_COLOR = Object.fromEntries(SECTIONS.map((s) => [s.key, s.color])) as Record<SectionKey, string>;

export const URGENCY_LABEL: Record<Urgency, string> = {
  5: "Breaking",
  4: "Urgent",
  3: "Timely",
  2: "Standard",
  1: "Routine",
};

export const URGENCY_EXAMPLE: Record<Urgency, string> = {
  5: "Major incident, election result, disaster",
  4: "Developing story, official announcement today",
  3: "Same-day news, event coverage",
  2: "Features, explainers with a news hook",
  1: "Municipal update, evergreen, notices",
};

export const STATUS_LABEL: Record<ArticleStatus, string> = {
  draft: "Draft",
  in_review: "Waiting for editor",
  changes_requested: "Edits requested",
  approved: "Approved",
  scheduled: "Scheduled",
  published_pending_check: "Live, quick check pending",
  published: "Live",
  rejected: "Not accepted",
  unpublished: "Removed from site",
  withdrawn: "Withdrawn",
  archived: "Archived",
};

export const LANGUAGE_LABEL: Record<Language, string> = { en: "English", hi: "हिन्दी (Hindi)" };
