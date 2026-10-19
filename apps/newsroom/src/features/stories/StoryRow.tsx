import { Link } from "react-router-dom";
import { ImageOff, MessageSquareText, Siren } from "lucide-react";
import clsx from "clsx";
import { targetLabel } from "@/domain/places";
import type { ArticleSummary } from "@/domain/types";
import { StatusPill } from "@/components/ui/badges";
import { EmptyState, SectionDot, timeAgo, waited } from "@/components/ui/primitives";

export function StoryRow({ a, show = "status", hideAuthor }: { a: ArticleSummary; show?: "status" | "waiting"; hideAuthor?: boolean }) {
  const hi = a.primary_language === "hi";
  return (
    <li>
      <Link to={`/stories/${a.id}`} className={clsx("flex gap-3 rounded-xl px-2 py-2.5 hover:bg-wash", a.priority === "breaking" && a.status === "submitted" && "bg-bad-soft/50 hover:bg-bad-soft")}>
        <span className="flex size-14 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-wash sm:size-16">
          {a.hero?.src ? (
            a.hero.kind === "video" && !a.hero.poster ? <video src={a.hero.src} muted preload="metadata" className="size-full object-cover" /> : <img src={a.hero.poster || a.hero.src} alt="" className="size-full object-cover" loading="lazy" />
          ) : (
            <ImageOff className="size-5 text-faint" aria-hidden="true" />
          )}
        </span>
        <span className="min-w-0 flex-1">
          <span className={clsx("line-clamp-2 text-[15px] font-medium leading-snug text-ink", hi && "lang-hi")} lang={a.primary_language}>
            {a.priority === "breaking" && <Siren className="mr-1 inline size-4 align-[-3px] text-bad" aria-label="Breaking" />}
            {a.headline || <span className="text-faint">Untitled story</span>}
          </span>
          <span className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-1 text-[12.5px] text-muted">
            {show === "status" && <StatusPill status={a.status} />}
            {show === "waiting" && a.submitted_at && <span className={clsx("font-medium", a.priority === "breaking" ? "text-bad" : "text-ink")}>waiting {waited(a.submitted_at)}</span>}
            {!hideAuthor && <span>{a.author.name}</span>}
            <SectionDot section={a.section} />
            <span>{targetLabel(a)}</span>
            {a.languages.length > 1 && <span className="rounded bg-select px-1 text-[11px]">EN + हि</span>}
            {a.open_notes > 0 && (
              <span className="inline-flex items-center gap-0.5 text-warn">
                <MessageSquareText className="size-3.5" aria-hidden="true" /> {a.open_notes}
              </span>
            )}
            <span className="text-faint">{timeAgo(a.status === "published" ? a.published_at : a.updated_at)}</span>
          </span>
        </span>
      </Link>
    </li>
  );
}

export function StoryList({ items, empty, show, hideAuthor, loading }: { items?: ArticleSummary[]; empty: { title: string; body?: string }; show?: "status" | "waiting"; hideAuthor?: boolean; loading?: boolean }) {
  if (!items) return loading === false ? null : <div className="space-y-2">{[0, 1, 2].map((i) => <div key={i} className="h-16 animate-pulse rounded-xl bg-wash" />)}</div>;
  if (!items.length) return <EmptyState title={empty.title} body={empty.body} />;
  return (
    <ul className="-mx-2 divide-y divide-line/70">
      {items.map((a) => (
        <StoryRow key={a.id} a={a} show={show} hideAuthor={hideAuthor} />
      ))}
    </ul>
  );
}
