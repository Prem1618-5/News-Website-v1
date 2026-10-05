import { dueAt, HOUR, MIN, SLA_MS } from "@/domain/sla";
import { heading, paragraph, quote } from "@/domain/content";
import type { Article, ArticleAnalytics, ArticleBlock, ArticleStatus, HeroMedia, Mistake, Preflight, SectionKey, Staff, Thread, Urgency } from "@/domain/types";
import type { NewsroomState } from "@/domain/workflow";
import type { ReviewOutcome } from "@/domain/supervision";

const DAY = 24 * HOUR;

function lcg(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

function analytics(views: number, seed: number, ageDays: number): ArticleAnalytics {
  const rnd = lcg(seed);
  const daily = new Array(30).fill(0) as number[];
  const start = Math.max(0, 29 - ageDays);
  const weights: number[] = [];
  for (let d = start; d < 30; d++) weights.push(Math.pow(0.62, d - start) * (0.8 + rnd() * 0.4));
  const total = weights.reduce((a, b) => a + b, 0);
  weights.forEach((w, i) => (daily[start + i] = Math.round((views * w) / total)));
  const direct = 0.2 + rnd() * 0.15;
  const search = 0.25 + rnd() * 0.2;
  const social = 0.15 + rnd() * 0.15;
  const internal = Math.max(0.05, 1 - direct - search - social);
  const r = (n: number) => Math.round(views * n);
  return {
    views,
    uniques: Math.round(views * (0.78 + rnd() * 0.1)),
    likes: Math.round(views * (0.012 + rnd() * 0.01)),
    saves: Math.round(views * (0.01 + rnd() * 0.012)),
    shares: Math.round(views * (0.005 + rnd() * 0.008)),
    avgEngagedSec: Math.round(70 + rnd() * 170),
    readThrough: Math.round((0.38 + rnd() * 0.34) * 100) / 100,
    source: { direct: r(direct), search: r(search), social: r(social), internal: r(internal) },
    daily,
    publishToFirstReadSec: Math.round(20 + rnd() * 240),
  };
}

const empty = analytics(0, 1, 0);

const SECTION_TAG: Record<SectionKey, string> = {
  world: "World news", politics: "Politics", business: "Economy", tech: "Technology", sports: "Sport", culture: "Arts", science: "Science",
};

function sampleBody(id: string, headline: string): ArticleBlock[] {
  return [
    paragraph(`${id}_p1`, `${headline}. Officials confirmed the details on Tuesday morning, and the first effects are expected within days.`),
    paragraph(`${id}_p2`, "People affected say they want clear guidance on what happens next and who to contact. A spokesperson said more information would be published this week."),
    heading(`${id}_h1`, "What happens next"),
    paragraph(`${id}_p3`, "The next update is due at the end of the month. Until then, residents are advised to follow official channels for the latest information."),
    quote(`${id}_q1`, "We will keep people informed at every step."),
  ];
}

const HERO_FILES = [
  "g7-to-release-millions-of-barrels-of-oil-and-diesel-after-tr", "ai-boom-could-trigger-market-shocks-bank-of-england-boss-war",
  "courts-backlog-will-fall-despite-scrapping-of-jury-trial-pla", "how-to-move-1300-plants-for-kews-palm-house-mega-makeover",
  "british-museum-announces-changes-to-ease-bayeux-tapestry-que", "ethiopian-rebel-forces-withdraw-from-tigray-regional-capital",
  "how-to-see-the-orionid-meteor-shower-this-weekend", "glastonbury-2027-tickets-sell-out-in-42-minutes",
  "djokovic-beats-zverev-to-reach-china-open-semis", "greens-would-offer-two-year-jobs-to-unemployed-under-24s",
];

function preflightHero(p: Preflight, id: string): HeroMedia | undefined {
  if (!p.hasHero) return undefined;
  const file = HERO_FILES[Number(id.replace(/\D/g, "")) % HERO_FILES.length];
  return {
    kind: "image", url: `/images/${file}.jpg`, alt: p.heroAlt ? "Scene from the story" : "", credit: p.heroCredit ? "News APP" : "",
    width: 1600, height: 900, caption: "",
  };
}

const HINDI_BODY: ArticleBlock[] = [
  paragraph("a23_p1", "शहर में मानसून की पहली भारी बारिश के बाद कई इलाकों में जलभराव की स्थिति बन गई। नगर निगम ने राहत दल तैनात किए हैं।"),
  paragraph("a23_p2", "अधिकारियों ने बताया कि अगले 48 घंटों में और बारिश की संभावना है। निचले इलाकों में रहने वाले लोगों को सतर्क रहने की सलाह दी गई है।"),
  heading("a23_h1", "आगे क्या होगा"),
  paragraph("a23_p3", "मौसम विभाग शाम को नया पूर्वानुमान जारी करेगा। स्कूलों को लेकर फैसला सुबह तक लिया जाएगा।"),
];

const clean: Preflight = { hasHero: true, heroAlt: true, heroCredit: true, hasByline: true, hasSection: true, bodyBlocks: 9, brokenMedia: false, slugUnique: true };

export function seedState(): NewsroomState {
  const now = Date.now();
  const ago = (ms: number) => now - ms;

  const person = (p: Partial<Staff> & Pick<Staff, "id" | "name" | "role" | "jobTitle">): Staff => ({
    email: `${p.name.toLowerCase().replace(/[^a-z]+/g, ".")}@newsapp.example`,
    status: "active",
    publishMode: "review",
    supervision: "none",
    presence: "available",
    mfa: p.role !== "reporter",
    lastActiveAt: ago(5 * MIN),
    createdAt: ago(120 * DAY),
    ...p,
  });

  const staff: Staff[] = [
    person({ id: "jane", name: "Jane Black", role: "admin", jobTitle: "Managing editor", publishMode: "auto" }),
    person({ id: "mary", name: "Mary Metcalfe", role: "editor", jobTitle: "Politics & World editor", presence: "available", lastActiveAt: ago(1 * MIN) }),
    person({ id: "landon", name: "Landon Shepherd", role: "editor", jobTitle: "Business & Tech editor", presence: "busy", lastActiveAt: ago(3 * MIN) }),
    person({ id: "priya", name: "Priya Nair", role: "editor", jobTitle: "Culture & Science editor", presence: "off_shift", lastActiveAt: ago(9 * HOUR) }),
    person({ id: "alice", name: "Alice Chen", role: "reporter", jobTitle: "Business reporter", editorId: "mary", backupEditorId: "landon", publishMode: "auto" }),
    person({ id: "anthony", name: "Anthony Buteo", role: "reporter", jobTitle: "City hall reporter", editorId: "mary", backupEditorId: "landon" }),
    person({
      id: "carry", name: "Carry Beck", role: "reporter", jobTitle: "Economy reporter", editorId: "mary", backupEditorId: "landon",
      supervision: "supervised", supervisionReason: "Automatic: 4 counted mistakes across 3 articles", supervisedAt: ago(9 * DAY), mfa: true,
    }),
    person({ id: "dave", name: "Dave Walker", role: "reporter", jobTitle: "Environment reporter", editorId: "landon", backupEditorId: "mary" }),
    person({ id: "emmett", name: "Emmett Brown", role: "reporter", jobTitle: "Tech reporter", editorId: "landon", backupEditorId: "priya", publishMode: "auto", mfa: true }),
    person({ id: "john", name: "John Miller", role: "reporter", jobTitle: "Local reporter", editorId: "landon", backupEditorId: "priya" }),
    person({ id: "jessica", name: "Jessica Awad", role: "reporter", jobTitle: "Culture writer", editorId: "priya", backupEditorId: "mary" }),
    person({ id: "sam", name: "Sam Okafor", role: "reporter", jobTitle: "Science reporter", editorId: "priya", backupEditorId: "mary", status: "invited", mfa: false, lastActiveAt: ago(2 * DAY) }),
  ];

  const art = (
    id: string,
    headline: string,
    authorId: string,
    section: SectionKey,
    urgency: Urgency,
    status: ArticleStatus,
    extra: Partial<Article> = {},
    views = 0,
    ageDays = 0,
  ): Article => ({
    id,
    slug: headline.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "").slice(0, 60),
    kicker: section.toUpperCase(),
    headline,
    standfirst: "",
    section,
    authorId,
    urgency,
    sensitivity: false,
    hold: false,
    status,
    origin: "demo",
    createdAt: ago(Math.max(ageDays, 0.2) * DAY + 3 * HOUR),
    updatedAt: ago(ageDays * DAY),
    preflight: clean,
    threads: [],
    verdicts: [],
    analytics: views ? analytics(views, id.length * 977 + headline.length * 31, ageDays) : empty,
    language: "en",
    body: sampleBody(id, headline),
    tags: [SECTION_TAG[section]],
    hero: preflightHero(extra.preflight ?? clean, id),
    activity: [{ id: `${id}_created`, at: ago(Math.max(ageDays, 0.2) * DAY + 3 * HOUR), actorId: authorId, kind: "created", summary: "Started the draft" }],
    ...extra,
  });

  const submit = (sub: number, urgency: Urgency, _author: string, extra = {}) => ({
    cycleNo: 1,
    submittedAt: ago(sub),
    urgencyAtSubmit: urgency,
    dueAt: dueAt(ago(sub), urgency),
    escalationLevel: 0,
    reminderSent: false,
    poolOpen: urgency === 5 || sub >= SLA_MS[urgency] * ({ 5: 0, 4: 0.5, 3: 0.75, 2: 0.75, 1: 0.9 } as const)[urgency],
    ...extra,
  });

  const thread = (id: string, label: string, severity: Thread["severity"], by: string, body: string, status: Thread["status"] = "open"): Thread => ({
    id, blockLabel: label, severity, status, createdBy: by, comments: [{ id: id + "c", authorId: by, body, at: ago(40 * MIN) }],
  });

  const articles: Article[] = [
    art("a1", "Flood warning issued for river districts as water levels climb", "dave", "world", 5, "in_review", { cycle: submit(12 * MIN, 5, "dave"), standfirst: "Authorities urge residents near the lower basin to prepare for evacuation orders." }),
    art("a2", "Central bank holds rates, signals a cut by autumn", "carry", "business", 4, "in_review", {
      cycle: submit(35 * MIN, 4, "carry", { claimedBy: "mary", claimExpiresAt: now + 21 * MIN }),
      threads: [thread("t1", "Paragraph 3", "blocking", "mary", "The 0.25 figure is not attributed. Who said this?")],
    }),
    art("a3", "Stadium deal clears council vote after late amendments", "anthony", "politics", 3, "in_review", { cycle: submit(2 * HOUR, 3, "anthony") }),
    art("a4", "What the new transit pass means for commuters", "jessica", "culture", 2, "in_review", { cycle: submit(10 * HOUR, 2, "jessica") }),
    art("a5", "Library opening hours change from March", "john", "world", 1, "in_review", { cycle: submit(45 * HOUR, 1, "john") }),
    art("a6", "Councillor faces allegations over contract awards", "sam", "politics", 3, "in_review", {
      sensitivity: true, hold: true, holdNote: "Legal read pending",
      cycle: submit(3 * HOUR, 3, "sam"),
      threads: [thread("t2", "Headline", "blocking", "priya", "Headline states guilt. Needs right of reply before we go.")],
    }),
    art("a7", "Chip makers brace for new export curbs", "emmett", "tech", 3, "changes_requested", {
      cycle: submit(20 * HOUR, 3, "emmett"), threads: [thread("t3", "Standfirst", "advisory", "landon", "Tighten to one sentence.", "open")],
      verdicts: [{ id: "v1", cycleNo: 1, verdict: "request_changes", byId: "landon", summary: "Good reporting; fix attribution and tighten the intro.", at: ago(5 * HOUR) }],
    }),
    art("a8", "Inside the lab growing coral for dying reefs", "alice", "science", 2, "draft"),
    art("a9", "Ten-year tech outlook: what the next decade holds", "emmett", "tech", 1, "draft", { preflight: { ...clean, heroCredit: false, bodyBlocks: 4 } }),
    art("a10", "Quarterly earnings beat forecasts at three grocers", "alice", "business", 3, "published_pending_check", { publishedAt: ago(40 * MIN), publishedVia: "direct", checkDueAt: now + 7 * HOUR + 20 * MIN }, 3100, 0),
    art("a11", "New cycling lanes open across the east side", "john", "world", 2, "published", { publishedAt: ago(1.2 * DAY), publishedVia: "timeout", checkDueAt: now - 2 * HOUR }, 8400, 1),
    art("a12", "Opposition tables no-confidence motion", "anthony", "politics", 4, "published", { publishedAt: ago(2.3 * DAY), publishedVia: "approval" }, 41200, 2),
    art("a13", "Startup funding rebounds in the second quarter", "alice", "business", 3, "published", { publishedAt: ago(4 * DAY), publishedVia: "direct" }, 17600, 4),
    art("a14", "The quiet return of the neighbourhood cinema", "jessica", "culture", 2, "published", { publishedAt: ago(6 * DAY), publishedVia: "approval" }, 12900, 6),
    art("a15", "Marathon record falls in perfect conditions", "john", "sports", 3, "published", { publishedAt: ago(8 * DAY), publishedVia: "approval" }, 28900, 8),
    art("a16", "Vaccine trial shows promising early results", "dave", "science", 4, "published", { publishedAt: ago(11 * DAY), publishedVia: "approval" }, 36400, 11),
    art("a17", "Port strike enters third day as talks stall", "carry", "business", 4, "published", { publishedAt: ago(13 * DAY), publishedVia: "approval" }, 22100, 13),
    art("a18", "City unveils plan for car-free riverfront", "anthony", "world", 2, "published", { publishedAt: ago(16 * DAY), publishedVia: "approval" }, 15400, 16),
    art("a19", "Battery recycling start-up raises new round", "emmett", "tech", 2, "published", { publishedAt: ago(19 * DAY), publishedVia: "direct" }, 9800, 19),
    art("a20", "Opening night review: a bold new Hamlet", "jessica", "culture", 1, "published", { publishedAt: ago(22 * DAY), publishedVia: "approval" }, 6200, 22),
    art("a21", "Unverified claim on school closures", "john", "politics", 3, "unpublished", {
      publishedAt: ago(5 * DAY), publishedVia: "approval", takedown: { byId: "landon", reason: "Factual error", at: ago(4.5 * DAY) },
    }, 5400, 5),
    art("a22", "Editor's note: how we cover elections", "jane", "politics", 1, "draft"),
    art("a23", "पहली भारी बारिश के बाद शहर में जलभराव, राहत दल तैनात", "alice", "world", 3, "draft", {
      language: "hi", kicker: "मौसम", standfirst: "निचले इलाकों में रहने वालों को सतर्क रहने की सलाह", body: HINDI_BODY, tags: ["मानसून"],
    }),
  ];

  const mk = (id: string, articleId: string, reporterId: string, category: Mistake["category"], severity: Mistake["severity"], daysAgo: number, note: string, extra: Partial<Mistake> = {}): Mistake => ({
    id, articleId, reporterId, category, severity, note, at: ago(daysAgo * DAY), countsTowardQuality: true, disputed: false, ...extra,
  });

  const mistakes: Mistake[] = [
    mk("m1", "a17", "carry", "Factual accuracy", "major", 13, "Cargo tonnage was off by a factor of ten."),
    mk("m2", "a17", "carry", "Sourcing / attribution", "minor", 13, "Union quote lacked attribution."),
    mk("m3", "a2o", "carry", "Headline accuracy", "minor", 12, "Headline overstated the finding."),
    mk("m4", "a2p", "carry", "Context / balance", "minor", 11, "No response sought from the employer."),
    mk("m5", "a16", "dave", "Factual accuracy", "major", 11, "Trial size misreported."),
    mk("m6", "a15", "john", "Style / grammar", "minor", 8, "Inconsistent house style on numerals."),
    mk("m7", "a18", "anthony", "Media & credits", "minor", 16, "Photo credit missing."),
    mk("m8", "a20", "jessica", "Style / grammar", "minor", 22, "Typos in the standfirst."),
  ];

  const out = (articleId: string, reporterId: string, daysAgo: number, minor = 0, major = 0, critical = 0): ReviewOutcome & { reporterId: string } => ({
    articleId, at: ago(daysAgo * DAY), minor, major, critical, reporterId,
  });

  const outcomes = [
    out("a17", "carry", 13, 1, 1), out("a2o", "carry", 12, 1), out("a2p", "carry", 11, 1),
    out("c1", "carry", 6), out("c2", "carry", 4), out("c3", "carry", 2),
    out("a16", "dave", 11, 0, 1), out("a14", "jessica", 6), out("a12", "anthony", 2),
  ];

  return {
    actorId: "jane",
    staff,
    articles,
    mistakes,
    outcomes: outcomes as ReviewOutcome[],
    notices: [
      { id: "n1", kind: "notice", fromId: "mary", toId: "carry", body: "Please attribute every figure in economy copy. Happy to pair on the next one.", at: ago(7 * DAY) },
      { id: "n2", kind: "notice", fromId: "landon", toId: "dave", body: "Check sample sizes against the paper, not the press release.", at: ago(10 * DAY) },
    ],
    audit: [
      { id: "au1", at: ago(14 * MIN), actorId: "mary", action: "review.claim", entity: "article:a2", outcome: "ok" },
      { id: "au2", at: ago(38 * MIN), actorId: "alice", action: "article.publish", entity: "article:a10", outcome: "ok", detail: "direct" },
      { id: "au3", at: ago(2 * HOUR), actorId: "anthony", action: "article.submit", entity: "article:a3", outcome: "ok", detail: "cycle 1, urgency 3" },
      { id: "au4", at: ago(5 * HOUR), actorId: "landon", action: "review.request_changes", entity: "article:a7", outcome: "ok", detail: "1 mistakes tagged" },
      { id: "au5", at: ago(9 * DAY), actorId: "system", action: "supervision.enter", entity: "staff:carry", outcome: "ok", detail: "Automatic: 4 counted mistakes across 3 articles" },
    ],
    settings: { autoPublishEnabled: true, timeoutPublishEnabled: true, urgency5QuotaPer24h: 3 },
  };
}
