import type React from "react";
import clsx from "clsx";
import type { ActivityEntry, ActivityKind } from "@/domain/types";
import { getStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { Avatar, Pill, timeAgo } from "@/components/ui/primitives";

const KIND_TAG: Partial<Record<ActivityKind, { label: string; tone: "brand" | "warn" | "good" | "bad" | "neutral" }>> = {
  editor_fix: { label: "Editor fix", tone: "brand" },
  commented: { label: "Comment", tone: "neutral" },
  decision: { label: "Decision", tone: "good" },
  paused: { label: "Paused", tone: "warn" },
  removed: { label: "Removed", tone: "bad" },
  published: { label: "Live", tone: "good" },
};

/** Who changed what, newest first. Shown to both the reporter and the editor. */
export function ActivityTimeline({ entries, onJump }: { entries: ActivityEntry[]; onJump?: (blockId: string) => void }) {
  const { state } = useNewsroom();
  if (!entries.length) return <p className="text-[13px] text-muted">No changes yet.</p>;

  return (
    <ol className="relative space-y-4 before:absolute before:inset-y-1 before:left-[13px] before:w-px before:bg-line">
      {entries.map((e) => {
        const who = getStaff(state, e.actorId);
        const tag = KIND_TAG[e.kind];
        return (
          <li key={e.id} className="relative flex gap-3">
            <span className="relative z-10 rounded-full ring-4 ring-white">
              <Avatar person={who ?? { id: "system", name: "System" }} size={26} />
            </span>
            <div className="min-w-0 flex-1 pt-0.5">
              <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-[13px]">
                <span className="font-medium text-ink">{who?.name ?? "System"}</span>
                <span className="text-muted">{e.summary.charAt(0).toLowerCase() + e.summary.slice(1)}</span>
                {tag && <Pill tone={tag.tone}>{tag.label}</Pill>}
              </div>
              <time className="text-[12px] text-faint" dateTime={new Date(e.at).toISOString()}>
                {timeAgo(e.at)}
              </time>
              {(e.before || e.after) && (
                <div
                  className={clsx(
                    "mt-1.5 space-y-1 rounded-lg border border-line bg-wash px-2.5 py-2 text-[13px] leading-snug",
                    e.blockId && onJump && "cursor-pointer hover:border-brand/40",
                  )}
                  {...(e.blockId && onJump
                    ? {
                        role: "button",
                        tabIndex: 0,
                        "aria-label": "Show this passage in the story",
                        onClick: () => onJump(e.blockId!),
                        onKeyDown: (k: React.KeyboardEvent) => (k.key === "Enter" || k.key === " ") && onJump(e.blockId!),
                      }
                    : {})}
                >
                  {e.kind === "commented" || e.kind === "replied" || e.kind === "decision" || e.kind === "paused" || e.kind === "removed" || e.kind === "published" ? (
                    <>
                      {e.before && <p className="border-l-2 border-warn pl-2 italic text-muted">{`"${e.before}"`}</p>}
                      {e.after && <p className="text-ink">{e.after}</p>}
                    </>
                  ) : (
                    <>
                      {e.before && (
                        <p className="text-muted">
                          <span className="sr-only">Before: </span>
                          <del className="decoration-bad/60">{e.before}</del>
                        </p>
                      )}
                      {e.after && (
                        <p className="text-ink">
                          <span className="sr-only">After: </span>
                          <ins className="no-underline">{e.after}</ins>
                        </p>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
