import { useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { ChevronDown, Download, ListFilter, PenSquare, Search, X } from "lucide-react";
import { ArticleDrawer } from "@/features/articles/ArticleDrawer";
import { useNavigate } from "react-router-dom";
import { ModePill, StatusPill } from "@/components/ui/badges";
import { Avatar, Button, EmptyState, PageHeader, Pill, SectionDot, Tabs, inputCls, shortDate } from "@/components/ui/primitives";
import { STATUS_LABEL, type Article, type ArticleStatus } from "@/domain/types";
import { effectiveMode, getStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import clsx from "clsx";

type View = "all" | "drafts" | "review" | "published";
const nf = new Intl.NumberFormat();

export default function Articles() {
  const { state, actor } = useNewsroom();
  const [params, setParams] = useSearchParams();
  const [view, setView] = useState<View>("all");
  const [status, setStatus] = useState<ArticleStatus | "any">("any");
  const [q, setQ] = useState(params.get("q") ?? "");
  const [openId, setOpenId] = useState<string | null>(null);
  const navigate = useNavigate();
  const [tip, setTip] = useState(true);
  const heldOnly = params.get("filter") === "held";

  const scoped = useMemo(
    () =>
      state.articles.filter((a) => {
        if (actor.role === "admin") return true;
        if (a.authorId === actor.id) return true;
        if (actor.role === "reporter") return false;
        const author = getStaff(state, a.authorId);
        const assigned = author?.editorId === actor.id || author?.backupEditorId === actor.id;
        return assigned || !!a.publishedAt || !!a.cycle?.poolOpen;
      }),
    [state, actor],
  );

  const rows = scoped
    .filter((a) => (heldOnly ? a.hold : true))
    .filter((a) => (view === "drafts" ? ["draft", "changes_requested"].includes(a.status) : view === "review" ? a.status === "in_review" : view === "published" ? !!a.publishedAt && a.status !== "unpublished" : true))
    .filter((a) => (status === "any" ? true : a.status === status))
    .filter((a) => (q.trim() ? a.headline.toLowerCase().includes(q.trim().toLowerCase()) : true))
    .sort((a, b) => (b.publishedAt ?? b.updatedAt) - (a.publishedAt ?? a.updatedAt));

  const monthAgo = Date.now() - 30 * 86_400_000;
  const publishedThisMonth = scoped.filter((a) => a.publishedAt && a.publishedAt >= monthAgo && a.status !== "unpublished").length;
  const inReview = scoped.filter((a) => a.status === "in_review").length;
  const needsWork = scoped.filter((a) => ["draft", "changes_requested"].includes(a.status)).length;

  return (
    <>
      <PageHeader title={actor.role === "reporter" ? "My articles" : "All content"}>
        <Button onClick={() => navigate("/write")}>
          <PenSquare className="size-4" /> New article
        </Button>
      </PageHeader>

      {tip && (
        <div className="relative mb-5 max-w-[420px] rounded-xl bg-ink px-4 py-3 pr-9 text-[13px] text-white">
          <p className="font-medium">Pre-flight runs on every publish path</p>
          <p className="mt-0.5 text-white/70">Direct, approved, timeout and scheduled. A missing alt text or credit blocks publishing, including auto-publish.</p>
          <button onClick={() => setTip(false)} aria-label="Dismiss tip" className="absolute right-2.5 top-2.5 text-white/60 hover:text-white">
            <X className="size-4" />
          </button>
        </div>
      )}

      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Tabs
          label="Saved views"
          value={view}
          onChange={setView}
          items={[
            { id: "all", label: "All" },
            { id: "drafts", label: "Drafts", count: needsWork },
            { id: "review", label: "In review", count: inReview },
            { id: "published", label: "Published" },
          ]}
        />
      </div>

      <div className="mb-5 flex flex-wrap items-center gap-2">
        <span className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[14px] text-muted">
          <ListFilter className="size-4" /> Filters
        </span>
        <label className="relative">
          <span className="sr-only">Status</span>
          <select value={status} onChange={(e) => setStatus(e.target.value as ArticleStatus | "any")} className={clsx(inputCls, "w-[170px]! appearance-none pr-8")}>
            <option value="any">Any status</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
          <ChevronDown className="pointer-events-none absolute right-2.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
        </label>
        <label className="relative min-w-[160px] flex-1 sm:max-w-[240px]">
          <span className="sr-only">Keyword</span>
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
          <input
            value={q}
            onChange={(e) => {
              setQ(e.target.value);
              if (params.get("q")) setParams({});
            }}
            placeholder="Keyword"
            className={clsx(inputCls, "pl-9")}
          />
        </label>
        {heldOnly && (
          <Pill tone="warn" className="h-9 px-3 text-[13px]">
            Held only
            <button aria-label="Clear held filter" onClick={() => setParams({})}>
              <X className="size-3.5" />
            </button>
          </Pill>
        )}
        <Button className="ml-auto" disabled title="CSV export arrives with the analytics API">
          <Download className="size-4" /> Export
        </Button>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4 border-y border-line py-4">
        <Stat label="Published, 30 days" value={publishedThisMonth} />
        <Stat label="In review" value={inReview} />
        <Stat label={actor.role === "reporter" ? "Needs your attention" : "Drafts and revisions"} value={needsWork} />
      </div>

      {rows.length === 0 ? (
        <EmptyState title="No articles match" body="Try a different view or clear the keyword." />
      ) : (
        <div role="table" aria-label="Articles">
          <div role="row" className="hidden grid-cols-[72px_minmax(0,1fr)_150px_120px_90px] gap-4 border-b border-line px-2 pb-2 text-[12px] font-medium text-muted lg:grid">
            <span role="columnheader">Date</span>
            <span role="columnheader">Headline</span>
            <span role="columnheader">Status</span>
            <span role="columnheader">Section</span>
            <span role="columnheader" className="text-right">Views</span>
          </div>
          {rows.map((a) => (
            <ArticleRow key={a.id} a={a} onOpen={() => setOpenId(a.id)} />
          ))}
        </div>
      )}

      {openId && <ArticleDrawer articleId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-[12px] text-muted sm:text-[13px]">{label}</p>
      <p className="mt-0.5 text-[24px] leading-tight tracking-tight sm:text-[28px]">{value}</p>
    </div>
  );
}

function ArticleRow({ a, onOpen }: { a: Article; onOpen: () => void }) {
  const { state } = useNewsroom();
  const author = getStaff(state, a.authorId)!;
  return (
    <div role="row" className="border-b border-line">
      <button
        onClick={onOpen}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1.5 px-2 py-3.5 text-left hover:bg-wash lg:grid-cols-[72px_minmax(0,1fr)_150px_120px_90px]"
      >
        <span role="cell" className="hidden text-[13px] text-muted lg:block">
          {shortDate(a.publishedAt ?? a.updatedAt)}
        </span>
        <span role="cell" className="flex min-w-0 items-center gap-3">
          <Avatar person={author} size={28} />
          <span className="min-w-0">
            <span className="block truncate font-serif text-[14px] font-medium">{a.headline}</span>
            <span className="block truncate text-[12px] text-muted">
              {author.name} <span className="lg:hidden">· {shortDate(a.publishedAt ?? a.updatedAt)}</span>
            </span>
          </span>
        </span>
        <span role="cell" className="flex flex-wrap items-center justify-end gap-1.5 lg:justify-start">
          <StatusPill status={a.status} />
          {a.hold && <Pill tone="warn">Held</Pill>}
          <span className="hidden xl:inline-flex">{a.status === "in_review" && <ModePill mode={effectiveMode(author)} />}</span>
        </span>
        <span role="cell" className="hidden lg:block">
          <SectionDot section={a.section} />
        </span>
        <span role="cell" className="hidden text-right text-[14px] tabular-nums lg:block">
          {a.analytics.views ? nf.format(a.analytics.views) : "-"}
        </span>
      </button>
    </div>
  );
}
