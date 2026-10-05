import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PenSquare, Inbox, UserPlus, X, Check } from "lucide-react";
import clsx from "clsx";
import { useNavigate } from "react-router-dom";
import { PromptModal } from "@/components/ui/ConfirmDialog";
import { AreaSpark } from "@/components/ui/charts";
import { Avatar, Card, CardTitle, Pill, timeAgo } from "@/components/ui/primitives";
import { compareQueue } from "@/domain/sla";
import type { Settings } from "@/domain/types";
import { getStaff, setSetting } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { ActionPill, Greeting, PRESENCE_DOT, queueDepthSeries, slaCompliance } from "./shared";

export default function AdminHome() {
  const { state } = useNewsroom();
  const navigate = useNavigate();
  const inReview = state.articles.filter((a) => a.status === "in_review");
  const breaking = inReview.filter((a) => a.urgency === 5);
  const supervised = state.staff.filter((s) => s.supervision === "supervised");
  const checks = state.articles.filter((a) => a.status === "published_pending_check");
  const overdueChecks = checks.filter((a) => (a.checkDueAt ?? Infinity) <= Date.now());
  const held = state.articles.filter((a) => a.hold);
  const editors = state.staff.filter((s) => s.role === "editor");
  const series = useMemo(() => queueDepthSeries(inReview.length), [inReview.length]);
  const sla = slaCompliance(state.articles);
  const top = [...inReview].sort(compareQueue)[0];

  return (
    <>
      <Greeting />
      <div className="mb-6 flex flex-wrap gap-2">
        <ActionPill icon={<PenSquare className="size-4" />} onClick={() => navigate("/write")}>
          New article
        </ActionPill>
        <ActionPill icon={<Inbox className="size-4" />} to="/queue">
          Open queue
        </ActionPill>
        <ActionPill icon={<UserPlus className="size-4" />} to="/team?invite=1">
          Invite staff
        </ActionPill>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <CardTitle action={<Link to="/queue" className="text-[13px] font-medium text-brand hover:underline">View queue</Link>}>Review queue</CardTitle>
          <p className="text-[36px] leading-none tracking-tight">
            {inReview.length} <span className="text-[16px] text-muted">open</span>
          </p>
          <p className="mt-2 text-[13px] text-muted">
            {breaking.length > 0 ? <span className="font-medium text-bad">{breaking.length} breaking</span> : "No breaking items"}
            {top?.cycle && <> · next deadline {Math.max(0, Math.round((top.cycle.dueAt - Date.now()) / 60000))} min</>}
          </p>
          <div className="mt-4">
            <AreaSpark data={series} label="Queue depth, last 24 hours" height={110} />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-3 border-t border-line pt-3 text-[13px]">
            <div>
              <p className="text-muted">Reviewed in time, 7d</p>
              <p className="text-[18px] font-medium">{sla}%</p>
            </div>
            <div>
              <p className="text-muted">Unclaimed</p>
              <p className="text-[18px] font-medium">{inReview.filter((a) => !a.cycle?.claimedBy).length}</p>
            </div>
            <div>
              <p className="text-muted">Pool open</p>
              <p className="text-[18px] font-medium">{inReview.filter((a) => a.cycle?.poolOpen).length}</p>
            </div>
          </div>
        </Card>

        <Card className="p-5">
          <CardTitle action={<Link to="/team" className="text-[13px] font-medium text-brand hover:underline">Team</Link>}>Editors</CardTitle>
          <ul className="space-y-3">
            {editors.map((e) => {
              const reporters = state.staff.filter((s) => s.editorId === e.id).length;
              const claims = state.articles.filter((a) => a.cycle?.claimedBy === e.id && a.status === "in_review").length;
              return (
                <li key={e.id} className="flex items-center gap-3">
                  <Avatar person={e} size={32} />
                  <div className="min-w-0 flex-1 leading-tight">
                    <p className="truncate text-[14px] font-medium">{e.name}</p>
                    <p className="text-[12px] text-muted">
                      {reporters} reporters · {claims} claims
                    </p>
                  </div>
                  <span className="flex items-center gap-1.5 text-[12px] text-muted">
                    <span className={clsx("size-2 rounded-full", PRESENCE_DOT[e.presence])} />
                    {e.presence.replace("_", " ")}
                  </span>
                </li>
              );
            })}
          </ul>
          {editors.every((e) => e.presence !== "available") && <p className="mt-4 rounded-lg bg-bad-soft px-3 py-2 text-[13px] text-bad">No editor is available. Breaking items page you.</p>}
        </Card>
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <MiniCard title="Supervised reporters" value={supervised.length} to="/team?tab=supervised">
          {supervised.length ? supervised.map((s) => s.name).join(", ") : "Nobody"}
        </MiniCard>
        <MiniCard title="Post-publication checks" value={checks.length} to="/queue">
          {overdueChecks.length ? <span className="text-bad">{overdueChecks.length} overdue</span> : "All on time"}
        </MiniCard>
        <MiniCard title="On editorial hold" value={held.length} to="/articles?filter=held">
          {held.length ? held[0].headline : "Nothing held"}
        </MiniCard>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-2">
        <KillSwitches />
        <Card className="p-5">
          <CardTitle action={<span className="text-[12px] text-muted">Append-only</span>}>Recent audit events</CardTitle>
          <ul className="divide-y divide-line">
            {state.audit.slice(0, 6).map((e) => (
              <li key={e.id} className="flex items-start justify-between gap-3 py-2.5 text-[13px]">
                <span className="min-w-0">
                  <span className="font-medium">{getStaff(state, e.actorId)?.name ?? "System"}</span>{" "}
                  <span className="text-muted">{e.action}</span>
                  {e.outcome !== "ok" && (
                    <Pill tone={e.outcome === "denied" ? "warn" : "bad"} className="ml-1.5">
                      {e.outcome === "denied" ? "Blocked" : "Published without review"}
                    </Pill>
                  )}
                  {e.detail && <span className="block truncate text-muted">{e.detail}</span>}
                </span>
                <span className="shrink-0 text-muted">{timeAgo(e.at)}</span>
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <GettingStarted />
    </>
  );
}

function MiniCard({ title, value, to, children }: { title: string; value: number; to: string; children: React.ReactNode }) {
  return (
    <Link to={to} className="block rounded-2xl border border-line p-5 transition-colors hover:bg-wash">
      <p className="text-[14px] font-medium text-muted">{title}</p>
      <p className="mt-2 text-[32px] leading-none tracking-tight">{value}</p>
      <p className="mt-2 truncate text-[13px] text-muted">{children}</p>
    </Link>
  );
}

const SWITCHES: { key: keyof Settings; name: string; desc: string }[] = [
  { key: "autoPublishEnabled", name: "kill.newsroom.auto_mode", desc: "Allow auto-mode reporters to publish directly" },
  { key: "timeoutPublishEnabled", name: "kill.newsroom.timeout_publish", desc: "Publish eligible items when the review SLA expires" },
];

function KillSwitches() {
  const { state, run } = useNewsroom();
  const [pending, setPending] = useState<keyof Settings | null>(null);
  return (
    <Card className="p-5">
      <CardTitle action={<Pill tone="neutral">Production</Pill>}>Kill switches</CardTitle>
      <ul className="divide-y divide-line">
        {SWITCHES.map((s) => {
          const on = state.settings[s.key] as boolean;
          return (
            <li key={s.key} className="flex items-center justify-between gap-4 py-3">
              <div className="min-w-0">
                <p className="truncate font-mono text-[12px] font-medium">{s.name}</p>
                <p className="text-[13px] text-muted">{s.desc}</p>
              </div>
              <button
                role="switch"
                aria-checked={on}
                aria-label={s.name}
                onClick={() => setPending(s.key)}
                className={clsx("relative h-6 w-11 shrink-0 rounded-full transition-colors", on ? "bg-good" : "bg-select")}
              >
                <span className={clsx("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", on ? "left-[22px]" : "left-0.5")} />
              </button>
            </li>
          );
        })}
      </ul>
      {pending && (
        <PromptModal
          title={`Turn ${state.settings[pending] ? "off" : "on"} ${SWITCHES.find((s) => s.key === pending)!.name}`}
          label="Reason"
          hint="Production changes need a reason. This is written to the audit log."
          confirmLabel="Apply change"
          onConfirm={(t) => run((s, a) => setSetting(s, a, pending, !s.settings[pending], t))}
          onClose={() => setPending(null)}
        />
      )}
    </Card>
  );
}

function GettingStarted() {
  const { state } = useNewsroom();
  const [open, setOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const steps = [
    { label: "Invite your editors", done: state.staff.filter((s) => s.role === "editor").length >= 2, to: "/team?invite=1" },
    { label: "Assign every reporter to an editor", done: state.staff.filter((s) => s.role === "reporter").every((r) => r.editorId), to: "/team" },
    { label: "Review the SLA table", done: false, to: "/queue" },
    { label: "Check the kill switches", done: state.audit.some((a) => a.action === "flag.change"), to: "/" },
  ];
  if (hidden) return null;
  return (
    <div className="fixed bottom-4 right-4 z-30 w-[280px] max-w-[calc(100vw-2rem)] rounded-2xl border border-line bg-white shadow-xl">
      <div className="flex items-center justify-between px-4 py-3">
        <button onClick={() => setOpen((o) => !o)} aria-expanded={open} className="text-[14px] font-medium">
          Set up the newsroom <span className="text-muted">{steps.filter((s) => s.done).length}/{steps.length}</span>
        </button>
        <button onClick={() => setHidden(true)} aria-label="Dismiss checklist" className="text-muted hover:text-ink">
          <X className="size-4" />
        </button>
      </div>
      {open && (
        <ul className="border-t border-line px-2 py-2">
          {steps.map((s) => (
            <li key={s.label}>
              <Link to={s.to} className="flex items-center gap-2.5 rounded-lg px-2 py-2 text-[13px] hover:bg-wash">
                <span className={clsx("flex size-5 items-center justify-center rounded-full border", s.done ? "border-good bg-good text-white" : "border-line")}>{s.done && <Check className="size-3" />}</span>
                <span className={s.done ? "text-muted line-through" : ""}>{s.label}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
