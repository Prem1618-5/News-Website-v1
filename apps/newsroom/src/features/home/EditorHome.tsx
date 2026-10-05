import { Link } from "react-router-dom";
import { Inbox, PenSquare } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ModePill } from "@/components/ui/badges";
import { Avatar, Card, CardTitle, Countdown, Pill, Segmented } from "@/components/ui/primitives";
import { compareQueue } from "@/domain/sla";
import { improvementSignal } from "@/domain/supervision";
import type { Presence } from "@/domain/types";
import { effectiveMode, getStaff, setPresence } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { ActionPill, Greeting } from "./shared";

export default function EditorHome() {
  const { state, actor, run } = useNewsroom();
  const navigate = useNavigate();
  const mine = state.staff.filter((s) => s.role === "reporter" && s.editorId === actor.id);
  const queue = state.articles
    .filter((a) => a.status === "in_review" && a.authorId !== actor.id)
    .filter((a) => {
      const au = getStaff(state, a.authorId);
      return au?.editorId === actor.id || au?.backupEditorId === actor.id || a.cycle?.poolOpen;
    })
    .sort(compareQueue);
  const checks = state.articles.filter((a) => a.status === "published_pending_check" && mine.some((r) => r.id === a.authorId));
  const ready = mine.filter((r) => r.supervision === "supervised" && improvementSignal(state.outcomes, r, Date.now()).ready);

  return (
    <>
      <Greeting />
      <div className="mb-6 flex flex-wrap items-center gap-2">
        <ActionPill icon={<Inbox className="size-4" />} to="/queue">
          Open queue
        </ActionPill>
        <ActionPill icon={<PenSquare className="size-4" />} onClick={() => navigate("/write")}>
          New article
        </ActionPill>
        <div className="ml-auto">
          <Segmented<Presence>
            label="Your presence"
            value={actor.presence}
            onChange={(p) => run((s, a) => setPresence(s, a, p))}
            items={[
              { id: "available", label: "Available" },
              { id: "busy", label: "Busy" },
              { id: "away", label: "Away" },
            ]}
          />
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <CardTitle action={<Link to="/queue" className="text-[13px] font-medium text-brand hover:underline">View all</Link>}>My queue</CardTitle>
          <p className="text-[36px] leading-none tracking-tight">
            {queue.length} <span className="text-[16px] text-muted">to review</span>
          </p>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {queue.slice(0, 4).map((a) => (
              <li key={a.id}>
                <Link to="/queue" className="flex items-center justify-between gap-3 py-3 hover:bg-wash">
                  <span className="min-w-0">
                    <span className="block truncate font-serif text-[14px] font-medium">{a.headline}</span>
                    <span className="text-[12px] text-muted">{getStaff(state, a.authorId)?.name}</span>
                  </span>
                  <span className="shrink-0 text-right text-[13px]">
                    {a.urgency === 5 && <Pill tone="bad" className="mr-2">Breaking</Pill>}
                    {a.cycle && <Countdown to={a.cycle.dueAt} className="font-medium" />}
                  </span>
                </Link>
              </li>
            ))}
            {queue.length === 0 && <li className="py-6 text-[13px] text-muted">The queue is clear.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <CardTitle action={<Link to="/team" className="text-[13px] font-medium text-brand hover:underline">Manage</Link>}>My reporters</CardTitle>
          <ul className="space-y-3">
            {mine.map((r) => (
              <li key={r.id}>
                <Link to={`/team/${r.id}`} className="flex items-center gap-3 rounded-lg hover:bg-wash">
                  <Avatar person={r} size={30} />
                  <span className="min-w-0 flex-1 truncate text-[14px] font-medium">{r.name}</span>
                  <ModePill mode={effectiveMode(r)} />
                </Link>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Link to="/queue" className="block rounded-2xl border border-line p-5 hover:bg-wash">
          <p className="text-[14px] font-medium text-muted">Post-publication checks</p>
          <p className="mt-2 text-[32px] leading-none tracking-tight">{checks.length}</p>
          <p className="mt-2 text-[13px] text-muted">From your reporters</p>
        </Link>
        <Link to="/team?tab=supervised" className="block rounded-2xl border border-line p-5 hover:bg-wash">
          <p className="text-[14px] font-medium text-muted">Improvement signals</p>
          <p className="mt-2 text-[32px] leading-none tracking-tight">{ready.length}</p>
          <p className="mt-2 text-[13px] text-muted">{ready.length ? ready.map((r) => r.name).join(", ") + " may be ready" : "No one ready to leave supervision"}</p>
        </Link>
        <Link to="/articles?filter=held" className="block rounded-2xl border border-line p-5 hover:bg-wash">
          <p className="text-[14px] font-medium text-muted">On hold</p>
          <p className="mt-2 text-[32px] leading-none tracking-tight">{state.articles.filter((a) => a.hold).length}</p>
          <p className="mt-2 text-[13px] text-muted">Excluded from auto-publish</p>
        </Link>
      </div>
    </>
  );
}
