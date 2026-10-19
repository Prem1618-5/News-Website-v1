/**
 * The story's history drawn like `git log --graph`: the writer's work runs down the left lane, the desk's
 * (editors and admins) down the right, and every hand-over (sent for review, sent back, published) crosses
 * between them. Each version can be opened to see exactly which words changed.
 */
import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import clsx from "clsx";
import { useHistory } from "@/api/desk";
import { diffSize, changed, wordDiff } from "@/domain/diff";
import type { Revision, RevisionKind, Snapshot } from "@/domain/types";
import { Avatar, Pill, Spinner, dateTime, timeAgo } from "@/components/ui/primitives";
import { docText } from "@/features/editor/tools";
import { DiffText } from "./DiffText";

const KIND: Record<RevisionKind, { label: string; tone: "brand" | "warn" | "good" | "bad" | "neutral" }> = {
  create: { label: "Started", tone: "neutral" },
  edit: { label: "Edited", tone: "neutral" },
  submit: { label: "Sent", tone: "brand" },
  publish: { label: "Published", tone: "good" },
  request_changes: { label: "Sent back", tone: "warn" },
  reject: { label: "Declined", tone: "bad" },
  unpublish: { label: "Taken down", tone: "bad" },
  check: { label: "Checked", tone: "good" },
};

const LANE_X = { author: 10, desk: 30 } as const;

const DOT_Y = 20;

function Lanes({ lane, newerLane, first, last }: { lane: Revision["lane"]; newerLane?: Revision["lane"]; first: boolean; last: boolean }) {
  // Drawn per row, in pixels: two rails, and a curve from this entry's dot up to the lane of the entry above
  // it when the story changed hands between them.
  const x = LANE_X[lane];
  const up = newerLane ? LANE_X[newerLane] : x;
  return (
    <svg className="absolute inset-y-0 left-0 h-full w-10 overflow-visible" aria-hidden="true">
      {(["author", "desk"] as const).map((l) => (
        <line key={l} x1={LANE_X[l]} x2={LANE_X[l]} y1={first ? DOT_Y : 0} y2={last ? DOT_Y : "100%"} className={clsx("graph-rail", `graph-lane-${l}`)} />
      ))}
      {up !== x && <path d={`M${x} ${DOT_Y} C ${x} ${DOT_Y / 2}, ${up} ${DOT_Y / 2}, ${up} 0`} className={clsx("graph-hop", `graph-lane-${newerLane}`)} />}
    </svg>
  );
}

function snapText(s: Snapshot | null, lang: "en" | "hi") {
  if (!s) return { headline: "", standfirst: "", body: "" };
  return { headline: s[`headline_${lang}`] ?? "", standfirst: s[`standfirst_${lang}`] ?? "", body: docText(s[`body_${lang}`]) };
}

function VersionDiff({ before, after }: { before: Snapshot | null; after: Snapshot }) {
  const parts = (["en", "hi"] as const).flatMap((lang) => {
    const a = snapText(before, lang);
    const b = snapText(after, lang);
    return (["headline", "standfirst", "body"] as const)
      .map((field) => ({ lang, field, pieces: wordDiff(a[field], b[field]) }))
      .filter((p) => changed(p.pieces));
  });
  if (!parts.length) return <p className="text-[12.5px] text-muted">No wording changed in this step.</p>;
  return (
    <div className="space-y-2">
      {parts.map((p) => (
        <div key={`${p.lang}-${p.field}`} className="rounded-lg border border-line bg-white px-2.5 py-2">
          <p className="mb-1 text-[11px] font-semibold uppercase tracking-wide text-faint">
            {p.field === "headline" ? "Headline" : p.field === "standfirst" ? "Subheading" : "Text"} {p.lang === "hi" ? "· हिन्दी" : ""}
          </p>
          <DiffText pieces={p.pieces} lang={p.lang} className="max-h-60 overflow-y-auto text-[13px] leading-relaxed" />
        </div>
      ))}
    </div>
  );
}

export function HistoryGraph({ articleId, version }: { articleId: string; version: number }) {
  const { data, isLoading } = useHistory(articleId, version);
  const [open, setOpen] = useState<number | null>(null);
  const rows = useMemo(() => [...(data?.items ?? [])].reverse(), [data]);

  if (isLoading && !data) return <p className="flex items-center gap-2 text-[13px] text-muted"><Spinner /> Loading history</p>;
  if (!rows.length) return <p className="text-[13px] text-muted">No history yet.</p>;

  const previousSnapshot = (index: number): Snapshot | null => {
    for (let i = index + 1; i < rows.length; i++) if (rows[i].snapshot) return rows[i].snapshot;
    return null;
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-3 text-[12px] text-muted">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full graph-dot-author" /> Writer</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-full graph-dot-desk" /> Editors</span>
      </div>
      <ol>
        {rows.map((r, i) => {
          const kind = KIND[r.kind] ?? KIND.edit;
          const prev = previousSnapshot(i);
          const size = r.snapshot && prev ? diffSize(wordDiff(docText(prev.body_en) + docText(prev.body_hi), docText(r.snapshot.body_en) + docText(r.snapshot.body_hi))) : null;
          const expandable = !!r.snapshot && r.kind !== "create";
          const isOpen = open === r.id;
          return (
            <li key={r.id} className="relative pb-4 pl-12">
              <Lanes lane={r.lane} newerLane={rows[i - 1]?.lane} first={i === 0} last={i === rows.length - 1} />
              <span
                className={clsx("absolute top-[14px] size-3 -translate-x-1/2 rounded-full ring-[3px] ring-white", r.lane === "desk" ? "graph-dot-desk" : "graph-dot-author")}
                style={{ left: LANE_X[r.lane] }}
                aria-hidden="true"
              />
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 pt-2 text-[13px]">
                <Avatar person={r.actor} size={20} />
                <span className="font-medium text-ink">{r.actor.name}</span>
                <Pill tone={kind.tone}>{kind.label}</Pill>
                <time className="text-[12px] text-faint" dateTime={r.at} title={dateTime(r.at)}>
                  {timeAgo(r.at)}
                </time>
              </div>
              {r.summary && <p className="mt-0.5 text-[13px] text-muted">{r.summary}</p>}
              {expandable && (
                <button type="button" onClick={() => setOpen(isOpen ? null : r.id)} aria-expanded={isOpen} className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline">
                  {isOpen ? "Hide changes" : "See changes"}
                  {size && (size.added || size.removed) ? <span className="text-faint">(+{size.added} −{size.removed} words)</span> : null}
                  <ChevronDown className={clsx("size-3.5 transition-transform", isOpen && "rotate-180")} aria-hidden="true" />
                </button>
              )}
              {isOpen && r.snapshot && (
                <div className="mt-2">
                  <VersionDiff before={prev} after={r.snapshot} />
                </div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
