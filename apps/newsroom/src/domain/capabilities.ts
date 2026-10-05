import type { Article, Role, Staff } from "./types";

export type Scope = "own" | "assigned" | "pool" | "any";

export const CAPABILITIES = [
  "article.create",
  "article.preview",
  "article.submit",
  "article.publish_direct",
  "article.review",
  "article.set_urgency",
  "article.hold",
  "article.takedown",
  "review.queue",
  "reporter.set_mode",
  "supervision.manage",
  "notice.issue",
  "discipline.issue",
  "team.view",
  "team.manage",
  "analytics.own",
  "analytics.team",
  "analytics.newsroom",
  "analytics.audience",
  "audit.view",
  "flags.write",
  "settings.write",
] as const;
export type Capability = (typeof CAPABILITIES)[number];

export const CAPABILITY_LABEL: Record<Capability, string> = {
  "article.create": "Create and edit own drafts",
  "article.preview": "Preview articles",
  "article.submit": "Submit for review",
  "article.publish_direct": "Publish directly",
  "article.review": "Comment, request changes, approve, reject",
  "article.set_urgency": "Re-rate urgency",
  "article.hold": "Place articles on hold",
  "article.takedown": "Take down published articles",
  "review.queue": "Open the review queue",
  "reporter.set_mode": "Set reporter publish mode",
  "supervision.manage": "Place into or lift supervision",
  "notice.issue": "Issue notices",
  "discipline.issue": "Issue warnings and strikes",
  "team.view": "View the team",
  "team.manage": "Create, assign and suspend accounts",
  "analytics.own": "Analytics on own articles",
  "analytics.team": "Analytics on the team",
  "analytics.newsroom": "Newsroom and audience analytics",
  "analytics.audience": "Audience metrics",
  "audit.view": "View the audit log",
  "flags.write": "Change flags and kill switches",
  "settings.write": "Change SLA and thresholds",
};

export const ROLE_RANK: Record<Role, number> = { reporter: 1, editor: 2, admin: 3 };
export const ROLE_LABEL: Record<Role, string> = { reporter: "Reporter", editor: "Editor", admin: "App Admin" };

type Grant = Partial<Record<Capability, Scope>>;

export const ROLE_GRANTS: Record<Role, Grant> = {
  reporter: {
    "article.create": "own",
    "article.preview": "own",
    "article.submit": "own",
    "article.publish_direct": "own",
    "analytics.own": "own",
  },
  editor: {
    "article.create": "own",
    "article.preview": "pool",
    "article.submit": "own",
    "article.publish_direct": "own",
    "article.review": "pool",
    "article.set_urgency": "pool",
    "article.hold": "pool",
    "article.takedown": "pool",
    "review.queue": "pool",
    "reporter.set_mode": "assigned",
    "supervision.manage": "assigned",
    "notice.issue": "assigned",
    "team.view": "any",
    "analytics.own": "own",
    "analytics.team": "assigned",
  },
  admin: {
    "article.create": "own",
    "article.preview": "any",
    "article.submit": "own",
    "article.publish_direct": "any",
    "article.review": "any",
    "article.set_urgency": "any",
    "article.hold": "any",
    "article.takedown": "any",
    "review.queue": "any",
    "reporter.set_mode": "any",
    "supervision.manage": "any",
    "notice.issue": "any",
    "discipline.issue": "any",
    "team.view": "any",
    "team.manage": "any",
    "analytics.own": "own",
    "analytics.team": "any",
    "analytics.newsroom": "any",
    "analytics.audience": "any",
    "audit.view": "any",
    "flags.write": "any",
    "settings.write": "any",
  },
};

export function capabilitiesFor(role: Role): Capability[] {
  return Object.keys(ROLE_GRANTS[role]) as Capability[];
}

export function hasCapability(actor: Staff, cap: Capability): boolean {
  return cap in ROLE_GRANTS[actor.role];
}

export interface Decision {
  allowed: boolean;
  reason?: string;
}

const allow: Decision = { allowed: true };
const deny = (reason: string): Decision => ({ allowed: false, reason });

export interface Resource {
  article?: Article;
  author?: Staff;
  target?: Staff;
}

/**
 * The only authorization gate. Capability first, then scope, then the
 * hierarchy and four-eyes guards.
 */
export function authorize(actor: Staff, cap: Capability, resource: Resource = {}): Decision {
  if (actor.status !== "active") return deny("Your account is not active.");
  const scope = ROLE_GRANTS[actor.role][cap];
  if (!scope) return deny(`${ROLE_LABEL[actor.role]}s cannot do this.`);

  const { article, author, target } = resource;

  if (cap === "article.review") {
    if (article && article.authorId === actor.id) return deny("You cannot review your own article.");
    if (scope === "pool" && author && article?.cycle) {
      const assigned = author.editorId === actor.id || author.backupEditorId === actor.id;
      if (!assigned && !article.cycle.poolOpen) return deny("This item is not open to the pool yet.");
    }
  }

  if (scope === "own" && article && article.authorId !== actor.id && cap !== "article.preview") {
    return deny("You can only act on your own articles.");
  }
  if (cap === "article.preview" && scope === "own" && article && article.authorId !== actor.id) {
    return deny("You can only preview your own articles.");
  }

  if (scope === "assigned" && target) {
    if (target.role !== "reporter") return deny("Editors manage reporters only.");
    if (target.editorId !== actor.id) return deny("This reporter is not assigned to you.");
  }

  if ((cap === "supervision.manage" || cap === "reporter.set_mode" || cap === "notice.issue" || cap === "discipline.issue") && target) {
    if (target.id === actor.id) return deny("You cannot take this action on yourself.");
    if (ROLE_RANK[actor.role] <= ROLE_RANK[target.role]) return deny("You can only act on roles ranked below yours.");
  }

  if (cap === "article.takedown" && article && author) {
    if (actor.role === "editor" && author.role !== "reporter") return deny("Editors can take down reporters' articles only.");
  }

  return allow;
}
