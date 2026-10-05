import { useMemo, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, Check } from "lucide-react";
import clsx from "clsx";
import { ModePill } from "@/components/ui/badges";
import { PromptModal } from "@/components/ui/ConfirmDialog";
import { BarsMini } from "@/components/ui/charts";
import { Avatar, Button, Card, CardTitle, Pill, inputCls, shortDate, timeAgo } from "@/components/ui/primitives";
import { authorize } from "@/domain/capabilities";
import { countedMistakes, evaluateTrigger, improvementSignal, SUPERVISION_RULES } from "@/domain/supervision";
import { SEVERITY_POINTS } from "@/domain/types";
import { assignEditor, effectiveMode, enterSupervision, getStaff, issueNotice, liftSupervision, setPublishMode } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";

type Prompt = null | "notice" | "warning" | "strike" | "enter" | "lift";

export default function ReporterDetail() {
  const { id } = useParams();
  const { state, actor, run } = useNewsroom();
  const [prompt, setPrompt] = useState<Prompt>(null);
  const person = id ? getStaff(state, id) : undefined;
  const now = Date.now();

  const trend = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => ({ x: i === 5 ? "This wk" : `${5 - i}w ago`, y: 0 }));
    state.mistakes
      .filter((m) => m.reporterId === id)
      .forEach((m) => {
        const w = Math.floor((Date.now() - m.at) / (7 * 86_400_000));
        if (w >= 0 && w < 6) weeks[5 - w].y += SEVERITY_POINTS[m.severity];
      });
    return weeks;
  }, [state.mistakes, id]);

  if (!person || person.role !== "reporter") return <Navigate to="/team" replace />;
  const allowed = authorize(actor, "supervision.manage", { target: person });
  if (!allowed.allowed && actor.role !== "admin") return <Navigate to="/team" replace />;

  const editor = person.editorId ? getStaff(state, person.editorId) : undefined;
  const counted = countedMistakes(state.mistakes, person.id, now);
  const trig = evaluateTrigger(state.mistakes, person.id, now);
  const signal = improvementSignal(state.outcomes, person, now);
  const supervised = person.supervision === "supervised";
  const majors = counted.filter((m) => m.severity === "major").length;
  const criticals = counted.filter((m) => m.severity === "critical").length;
  const mistakes = state.mistakes.filter((m) => m.reporterId === person.id).sort((a, b) => b.at - a.at);
  const notices = state.notices.filter((n) => n.toId === person.id);
  const modeDecision = authorize(actor, "reporter.set_mode", { target: person });
  const canDiscipline = authorize(actor, "discipline.issue", { target: person }).allowed;

  return (
    <>
      <Link to="/team" className="mb-4 inline-flex items-center gap-1.5 text-[13px] font-medium text-muted hover:text-ink">
        <ArrowLeft className="size-4" /> Team
      </Link>
      <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Avatar person={person} size={44} />
          <div className="leading-tight">
            <h1 className="text-[28px] font-normal tracking-tight">{person.name}</h1>
            <p className="text-[13px] text-muted">
              {person.jobTitle} · last active {timeAgo(person.lastActiveAt)}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button onClick={() => setPrompt("notice")} disabled={!authorize(actor, "notice.issue", { target: person }).allowed}>
            Send notice
          </Button>
          {supervised ? (
            <Button variant="primary" onClick={() => setPrompt("lift")} disabled={!allowed.allowed}>
              Lift supervision
            </Button>
          ) : (
            <Button variant="danger" onClick={() => setPrompt("enter")} disabled={!allowed.allowed}>
              Place in supervision
            </Button>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card className="p-5">
          <CardTitle>Mistake points, last 30 days</CardTitle>
          <p className="text-[40px] leading-none tracking-tight">{trig.points}</p>
          <p className="mt-2 text-[13px] text-muted">
            {counted.length} counted mistakes across {new Set(counted.map((m) => m.articleId)).size} articles
          </p>
          <div className="mt-5 space-y-3">
            <Meter label="Counted mistakes (3 across 2 articles)" value={counted.length} max={SUPERVISION_RULES.countedMistakes} />
            <Meter label="Major mistakes (2)" value={majors} max={SUPERVISION_RULES.majorCount} />
            <Meter label="Critical mistakes (1)" value={criticals} max={SUPERVISION_RULES.criticalCount} />
          </div>
          <dl className="mt-5 divide-y divide-line border-t border-line text-[13px]">
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">Assigned editor</dt>
              <dd className="font-medium">
                {actor.role === "admin" ? (
                  <select
                    aria-label="Assigned editor"
                    className={clsx(inputCls, "h-8! w-[170px]! text-[13px]!")}
                    value={person.editorId}
                    onChange={(e) => run((s, a) => assignEditor(s, a, person.id, e.target.value))}
                  >
                    {state.staff.filter((s) => s.role === "editor").map((e) => (
                      <option key={e.id} value={e.id}>
                        {e.name}
                      </option>
                    ))}
                  </select>
                ) : (
                  editor?.name
                )}
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">Publish mode</dt>
              <dd>
                <select
                  aria-label="Publish mode"
                  className={clsx(inputCls, "h-8! w-[170px]! text-[13px]!")}
                  value={person.publishMode}
                  disabled={!modeDecision.allowed}
                  onChange={(e) => run((s, a) => setPublishMode(s, a, person.id, e.target.value as "auto" | "review"))}
                >
                  <option value="review">Review</option>
                  <option value="auto">Auto</option>
                </select>
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">Effective mode</dt>
              <dd>
                <ModePill mode={effectiveMode(person)} />
              </dd>
            </div>
            <div className="flex items-center justify-between py-2.5">
              <dt className="text-muted">MFA</dt>
              <dd className="font-medium">{person.mfa ? "Enrolled" : "Not enrolled"}</dd>
            </div>
          </dl>
          {supervised && <p className="mt-3 text-[12px] text-muted">Auto is locked while supervised.</p>}
        </Card>

        <div className="space-y-4">
          <Card className="p-5">
            <CardTitle>Mistake points per week</CardTitle>
            <BarsMini data={trend} label="Mistake points per week" height={170} />
          </Card>
          <Card className="p-5">
            <CardTitle action={supervised ? <Pill tone="warn">Supervised {person.supervisedAt ? `since ${shortDate(person.supervisedAt)}` : ""}</Pill> : <Pill tone="good">Not supervised</Pill>}>Supervision</CardTitle>
            {supervised ? (
              <>
                <p className="text-[13px]">{person.supervisionReason}</p>
                <div className="mt-4 space-y-3">
                  <Meter label={`Clean reviewed articles in a row (${signal.needed})`} value={signal.cleanStreak} max={signal.needed} good />
                  <Meter label={`Days served (${signal.daysNeeded})`} value={Math.min(signal.daysServed, signal.daysNeeded)} max={signal.daysNeeded} good />
                </div>
                {signal.ready ? (
                  <p className="mt-4 flex items-start gap-2 rounded-lg bg-good-soft px-3 py-2 text-[13px] text-good">
                    <Check className="mt-0.5 size-4 shrink-0" /> Improvement signal reached. This is a suggestion only; lifting is your decision, with a note.
                  </p>
                ) : (
                  <p className="mt-4 text-[12px] text-muted">The system never lifts supervision on its own.</p>
                )}
              </>
            ) : (
              <p className="text-[13px] text-muted">
                {person.liftedAt ? `Lifted ${timeAgo(person.liftedAt)}. A new trigger within 30 days is highlighted to the admin.` : "Triggered automatically by 3 counted mistakes across 2 articles, 2 major, or 1 critical in 30 days."}
              </p>
            )}
          </Card>
        </div>
      </div>

      <h2 className="mb-2 mt-8 text-[14px] font-medium text-muted">Review ledger</h2>
      {mistakes.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-line px-6 py-8 text-center text-[13px] text-muted">No mistakes tagged. Good work.</p>
      ) : (
        <div role="table" aria-label="Tagged mistakes">
          {mistakes.map((m) => {
            const article = state.articles.find((a) => a.id === m.articleId);
            return (
              <div role="row" key={m.id} className="grid grid-cols-[64px_minmax(0,1fr)_auto] items-center gap-4 border-b border-line px-2 py-3">
                <span role="cell" className="text-[13px] text-muted">{shortDate(m.at)}</span>
                <span role="cell" className="min-w-0">
                  <span className="block truncate text-[14px]">
                    {m.category}
                    <span className="text-muted"> · {article?.headline ?? "Earlier article"}</span>
                  </span>
                  {m.note && <span className="block truncate text-[12px] text-muted">{m.note}</span>}
                </span>
                <span role="cell">
                  <Pill tone={m.severity === "minor" ? "neutral" : m.severity === "major" ? "warn" : "bad"}>
                    {m.severity} · {SEVERITY_POINTS[m.severity]}
                  </Pill>
                </span>
              </div>
            );
          })}
        </div>
      )}

      <h2 className="mb-2 mt-8 text-[14px] font-medium text-muted">Notices and discipline</h2>
      <div className="space-y-2">
        {notices.map((n) => (
          <div key={n.id} className="rounded-xl bg-wash px-4 py-3 text-[13px]">
            <Pill tone={n.kind === "notice" ? "neutral" : n.kind === "warning" ? "warn" : "bad"} className="mr-2">
              {n.kind}
            </Pill>
            {n.body}
            <span className="block text-muted">{getStaff(state, n.fromId)?.name ?? "System"} · {timeAgo(n.at)}</span>
          </div>
        ))}
        {notices.length === 0 && <p className="text-[13px] text-muted">Nothing issued.</p>}
        {canDiscipline && (
          <div className="flex gap-2 pt-1">
            <Button size="sm" onClick={() => setPrompt("warning")}>Issue warning</Button>
            <Button size="sm" variant="danger" onClick={() => setPrompt("strike")}>Issue strike</Button>
          </div>
        )}
      </div>

      {(prompt === "notice" || prompt === "warning" || prompt === "strike") && (
        <PromptModal
          title={prompt === "notice" ? "Send an informal notice" : `Issue a formal ${prompt}`}
          label="Message"
          hint="The recipient is notified, must acknowledge, and can reply. It is recorded in the audit log."
          confirmLabel={prompt === "notice" ? "Send notice" : `Issue ${prompt}`}
          danger={prompt !== "notice"}
          onConfirm={(t) => run((s, a) => issueNotice(s, a, person.id, prompt, t))}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === "enter" && (
        <PromptModal
          title={`Place ${person.name} in supervision`}
          label="Reason"
          hint="Auto is revoked, in-flight post-publication checks become immediate reviews, and the reporter is told why."
          confirmLabel="Place in supervision"
          danger
          onConfirm={(t) => run((s, a) => enterSupervision(s, a, person.id, t))}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === "lift" && (
        <PromptModal
          title={`Lift supervision for ${person.name}`}
          label="Note"
          hint="They return to review mode, never straight to auto. Granting auto is a separate action."
          confirmLabel="Lift supervision"
          onConfirm={(t) => run((s, a) => liftSupervision(s, a, person.id, t))}
          onClose={() => setPrompt(null)}
        />
      )}
    </>
  );
}

function Meter({ label, value, max, good }: { label: string; value: number; max: number; good?: boolean }) {
  const pct = Math.min(100, (value / max) * 100);
  const hit = value >= max;
  return (
    <div>
      <div className="mb-1 flex justify-between text-[12px]">
        <span className="text-muted">{label}</span>
        <span className="font-medium tabular-nums">
          {value}/{max}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-select" role="progressbar" aria-valuenow={value} aria-valuemin={0} aria-valuemax={max} aria-label={label}>
        <div className={clsx("h-full rounded-full", good ? "bg-good" : hit ? "bg-bad" : value > 0 ? "bg-warn" : "bg-select")} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
