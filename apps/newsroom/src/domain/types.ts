/**
 * Shapes returned by the Newsroom API (/api/desk, /api/staff-auth). The server owns every rule; these
 * types only describe what it sends back.
 */
import type { JSONContent } from "@tiptap/react";
import { SECTIONS, type Priority, type ScopeKey, type SectionKey } from "@news/contracts";

export type { Priority, ScopeKey, SectionKey };
export type Role = "reporter" | "editor" | "admin";
export type Lang = "en" | "hi";
export type Status = "draft" | "submitted" | "changes_requested" | "published" | "rejected" | "unpublished";
export type NoteKind = "problem" | "suggestion" | "comment";
export type NoteStatus = "open" | "done" | "accepted" | "dismissed";
export type Doc = JSONContent;

export interface Staff {
  id: string;
  name: string;
  role: Role;
  jobTitle: string;
  status: "invited" | "pending" | "active" | "suspended";
  reportsTo: string;
  trusted: boolean;
  homeState: string;
  homeDistrict: string;
  writingLanguage: Lang;
  email?: string;
  createdAt?: string;
  lastLoginAt?: string | null;
  createdBy?: string;
  canManage?: boolean;
}

export interface Person {
  id: string;
  name: string;
  role: Role;
}

export interface Hero {
  kind: "image" | "video";
  src: string;
  poster: string;
  alt: string;
  caption: string;
  credit: string;
}

export interface Can {
  edit: boolean;
  review: boolean;
  submit: boolean;
  publish: boolean;
  update_live: boolean;
  unpublish: boolean;
  reopen: boolean;
  delete: boolean;
  check: boolean;
  note: boolean;
}

export interface ArticleSummary {
  id: string;
  status: Status;
  version: number;
  primary_language: Lang;
  languages: Lang[];
  headline: string;
  standfirst: string;
  section: SectionKey;
  scope: ScopeKey;
  state: string;
  district: string;
  priority: Priority;
  hero: Hero | null;
  author: Person;
  reviewer: Person | null;
  review_message: string;
  needs_check: boolean;
  slug: string;
  story_id: string;
  words: number;
  open_notes: number;
  created_at: string;
  updated_at: string;
  submitted_at: string | null;
  published_at: string | null;
}

export interface Reply {
  by: string;
  name: string;
  text: string;
  at: string;
}

export interface Note {
  id: string;
  kind: NoteKind;
  lang: Lang;
  quote: string;
  suggestion: string;
  message: string;
  status: NoteStatus;
  author: Person;
  replies: Reply[];
  resolved_by: string;
  created_at: string;
  resolved_at: string | null;
}

export interface Article extends ArticleSummary {
  headline_en: string;
  standfirst_en: string;
  body_en: Doc;
  headline_hi: string;
  standfirst_hi: string;
  body_hi: Doc;
  unproofed: Lang[];
  tags: string[];
  notes: Note[];
  changed_by: (Person & { at: string })[];
  senior_edits: number;
  can: Can;
}

export type RevisionKind = "create" | "edit" | "submit" | "publish" | "request_changes" | "reject" | "unpublish" | "check";

export interface Snapshot {
  headline_en: string;
  standfirst_en: string;
  body_en: Doc;
  headline_hi: string;
  standfirst_hi: string;
  body_hi: Doc;
  section: SectionKey;
  scope: ScopeKey;
  state: string;
  district: string;
  priority: Priority;
}

export interface Revision {
  id: number;
  kind: RevisionKind;
  summary: string;
  actor: Person;
  lane: "author" | "desk";
  at: string;
  started_at: string;
  snapshot: Snapshot | null;
}

export interface NoticeItem {
  id: number;
  kind: "submitted" | "breaking" | "returned" | "rejected" | "published" | "edited" | "joined" | "request";
  text: string;
  article_id: string;
  at: string;
  read: boolean;
}

export interface Me {
  staff: Staff;
  counts: { drafts: number; returned: number; waiting: number; to_review?: number; to_check?: number };
  unread: number;
}

export interface StatsRow {
  person: Person;
  drafts: number;
  waiting: number;
  returned: number;
  published: number;
  breaking: number;
  views: number;
}

export interface Stats {
  days: number;
  people: StatsRow[];
  published: number;
  median_wait_min: number | null;
  views: number;
  top: (ArticleSummary & { views: number })[];
  views_tracked: boolean;
}

export const ROLE_LABEL: Record<Role, string> = { reporter: "Reporter", editor: "Editor", admin: "Admin" };

export const STATUS_LABEL: Record<Status, string> = {
  draft: "Draft",
  submitted: "Waiting for review",
  changes_requested: "Back with notes",
  published: "Published",
  rejected: "Declined",
  unpublished: "Taken down",
};

export const SECTION_LABEL = Object.fromEntries(SECTIONS.map((s) => [s.key, s.en])) as Record<SectionKey, string>;
export const SECTION_LABEL_HI = Object.fromEntries(SECTIONS.map((s) => [s.key, s.hi])) as Record<SectionKey, string>;
export const SECTION_COLOR = Object.fromEntries(SECTIONS.map((s) => [s.key, s.color])) as Record<SectionKey, string>;
export const SECTION_KEYS = SECTIONS.map((s) => s.key);

export const isSenior = (s: Pick<Staff, "role"> | null | undefined) => s?.role === "editor" || s?.role === "admin";
