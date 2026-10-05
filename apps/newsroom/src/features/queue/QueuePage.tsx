import { useMemo, useState } from "react";
import { Navigate, useSearchParams } from "react-router-dom";
import { CheckCircle2, Clock, Siren, Eye, Lock } from "lucide-react";
import clsx from "clsx";
import { ArticleDrawer } from "@/features/articles/ArticleDrawer";
import { ModePill, UrgencyPill } from "@/components/ui/badges";
import { Avatar, Countdown, EmptyState, PageHeader, Pill, Tabs, timeAgo } from "@/components/ui/primitives";
import { compareQueue } from "@/domain/sla";
import type { Article } from "@/domain/types";
import { effectiveMode, getStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";

type Tab = "open" | "checks" | "resolved";

/** Items this person may see: their reporters', anything open to the pool, or everything for admins. */
export function useVisibleQueue(): Article[] {
  const { state, actor } = useNewsroom();
  return useMemo(
    () =>
      state.articles.filter((a) => {
        if (a.authorId === actor.id && actor.role !== "admin") return false;
        if (actor.role === "admin") return true;
        const author = getStaff(state, a.authorId);
        if (!author) return false;
        const assigned = author.editorId === actor.id || author.backupEditorId === actor.id;
        return assigned || !!a.cycle?.poolOpen || a.status === "published_pending_check";
      }),
    [state, actor],
  );
}

export default function Queue() {
  const { state, can } = useNewsroom();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>("open");
  const [openId, setOpenId] = useState<string | null>(null);
  const visible = useVisibleQueue();
  const breaking = params.get("lane") === "breaking";

  const open = visible.filter((a) => a.status === "in_review" && (!breaking || a.urgency === 5)).sort(compareQueue);
  const checks = visible.filter((a) => a.status === "published_pending_check").sort((a, b) => (a.checkDueAt ?? 0) - (b.checkDueAt ?? 0));
  const resolved = visible.filter((a) => a.verdicts.length > 0 && a.status !== "in_review").sort((a, b) => b.updatedAt - a.updatedAt);

  if (!can("review.queue")) return <Navigate to="/" replace />;

  const rows = tab === "open" ? open : tab === "checks" ? checks : resolved;

  return (
    <>
      <PageHeader title={breaking ? "Breaking lane" : "Review queue"} subtitle="Urgency 5 is pinned first, then the soonest deadline.">
        {breaking && (
          <button onClick={() => setParams({})} className="text-[13px] font-medium text-brand hover:underline">
            Show all urgencies
          </button>
        )}
      </PageHeader>

      <Tabs
        label="Queue views"
        value={tab}
        onChange={setTab}
        items={[
          { id: "open", label: "Open", count: open.length },
          { id: "checks", label: "Post-publication checks", count: checks.length },
          { id: "resolved", label: "Resolved", count: resolved.length },
        ]}
      />

      <div className="mt-5">
        {rows.length === 0 ? (
          <EmptyState title={tab === "open" ? "The queue is clear" : "Nothing here"} body={tab === "open" ? "New submissions appear here the moment a reporter sends them." : undefined} />
        ) : (
          <div role="table" aria-label="Review items">
            <div role="row" className="hidden grid-cols-[minmax(0,1fr)_150px_120px] gap-4 border-b border-line px-2 pb-2 text-[12px] font-medium text-muted md:grid">
              <span role="columnheader">Description</span>
              <span role="columnheader">{tab === "open" ? "Due in" : tab === "checks" ? "Check due" : "Result"}</span>
              <span role="columnheader">{tab === "open" ? "Received" : "Updated"}</span>
            </div>
            {rows.map((a) => (
              <QueueRow key={a.id} a={a} tab={tab} onOpen={() => setOpenId(a.id)} />
            ))}
          </div>
        )}
      </div>

      {tab === "open" && state.settings.timeoutPublishEnabled && (
        <p className="mt-6 text-[12px] text-muted">
          Eligible items at urgency 3 or below publish on timeout, followed by a mandatory check. Supervised reporters and urgency 4 or 5 never do.
        </p>
      )}

      {openId && <ArticleDrawer articleId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}

function QueueRow({ a, tab, onOpen }: { a: Article; tab: Tab; onOpen: () => void }) {
  const { state, actor } = useNewsroom();
  const author = getStaff(state, a.authorId)!;
  const mode = effectiveMode(author);
  const claimedBy = a.cycle?.claimedBy && (a.cycle.claimExpiresAt ?? 0) > Date.now() ? getStaff(state, a.cycle.claimedBy) : undefined;
  const mistakeCount = state.mistakes.filter((m) => m.reporterId === a.authorId).length;
  const Icon = a.urgency === 5 ? Siren : tab === "resolved" ? CheckCircle2 : Clock;
  const last = a.verdicts[a.verdicts.length - 1];

  return (
    <div role="row" className="border-b border-line">
      <button
        onClick={onOpen}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-2 py-3.5 text-left hover:bg-wash md:grid-cols-[minmax(0,1fr)_150px_120px]"
      >
        <span role="cell" className="flex min-w-0 items-start gap-3">
          <span className={clsx("mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full", a.urgency === 5 ? "bg-bad-soft text-bad" : "bg-wash text-muted")}>
            <Icon className="size-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-[14px] leading-snug">
              {tab === "checks" ? "Check " : "Review "}
              <span className="font-serif font-medium">{a.headline}</span>
              <span className="text-muted"> by {author.name}</span>
            </span>
            <span className="mt-1.5 flex flex-wrap items-center gap-1.5">
              <UrgencyPill urgency={a.urgency} />
              <ModePill mode={mode} />
              {mistakeCount > 0 && <Pill>{mistakeCount} {mistakeCount === 1 ? "mistake" : "mistakes"} on record</Pill>}
              {a.hold && <Pill tone="warn">Held</Pill>}
              {claimedBy && (
                <Pill tone={claimedBy.id === actor.id ? "good" : "neutral"}>
                  {claimedBy.id === actor.id ? <Lock className="size-3" /> : <Eye className="size-3" />}
                  {claimedBy.id === actor.id ? "Yours" : `${claimedBy.name.split(" ")[0]} reviewing`}
                </Pill>
              )}
              {tab === "open" && !claimedBy && a.cycle?.poolOpen && a.urgency !== 5 && <Pill tone="brand">Open to pool</Pill>}
              {tab === "open" && !claimedBy && a.urgency === 5 && <Pill tone="bad">Broadcast</Pill>}
            </span>
          </span>
        </span>
        <span role="cell" className="text-right text-[14px] md:text-left">
          {tab === "open" && a.cycle ? (
            <Countdown to={a.cycle.dueAt} className="font-medium" />
          ) : tab === "checks" && a.checkDueAt ? (
            a.checkDueAt <= Date.now() ? <span className="font-medium text-bad">Due now</span> : <Countdown to={a.checkDueAt} />
          ) : (
            <span className="flex items-center justify-end gap-2 md:justify-start">
              <Avatar person={getStaff(state, last?.byId ?? "")} size={20} />
              {last ? ({ approve: "Approved", approve_with_notes: "Approved", request_changes: "Changes", reject: "Rejected" }[last.verdict]) : "-"}
            </span>
          )}
        </span>
        <span role="cell" className="col-span-2 text-[13px] text-muted md:col-span-1 md:text-[14px]">
          {tab === "open" && a.cycle ? timeAgo(a.cycle.submittedAt) : timeAgo(a.updatedAt)}
        </span>
      </button>
    </div>
  );
}
