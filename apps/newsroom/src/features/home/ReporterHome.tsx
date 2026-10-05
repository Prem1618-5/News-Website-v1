import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { PenSquare, ShieldAlert, Info } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ArticleDrawer } from "@/features/articles/ArticleDrawer";
import { StatusPill } from "@/components/ui/badges";
import { BarsMini } from "@/components/ui/charts";
import { Card, CardTitle, Countdown, Pill, timeAgo } from "@/components/ui/primitives";
import { improvementSignal, SUPERVISION_RULES, evaluateTrigger } from "@/domain/supervision";
import { SEVERITY_POINTS } from "@/domain/types";
import { effectiveMode, getStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { ActionPill, Greeting } from "./shared";

export default function ReporterHome() {
  const { state, actor } = useNewsroom();
  const navigate = useNavigate();
  const [openId, setOpenId] = useState<string | null>(null);
  const mode = effectiveMode(actor);
  const editor = actor.editorId ? getStaff(state, actor.editorId) : undefined;
  const mine = state.articles.filter((a) => a.authorId === actor.id);
  const inReview = mine.filter((a) => a.status === "in_review");
  const drafts = mine.filter((a) => a.status === "draft");
  const feedback = mine.filter((a) => a.status === "changes_requested" || a.threads.some((t) => t.status === "open"));
  const notices = state.notices.filter((n) => n.toId === actor.id);

  const trend = useMemo(() => {
    const weeks = Array.from({ length: 6 }, (_, i) => ({ x: i === 5 ? "This wk" : `${5 - i}w ago`, y: 0 }));
    state.mistakes
      .filter((m) => m.reporterId === actor.id)
      .forEach((m) => {
        const w = Math.floor((Date.now() - m.at) / (7 * 86_400_000));
        if (w >= 0 && w < 6) weeks[5 - w].y += SEVERITY_POINTS[m.severity];
      });
    return weeks;
  }, [state.mistakes, actor.id]);

  const signal = improvementSignal(state.outcomes, actor, Date.now());
  const trigger = evaluateTrigger(state.mistakes, actor.id, Date.now());

  return (
    <>
      <Greeting />
      <div className="mb-5 flex flex-wrap gap-2">
        <ActionPill icon={<PenSquare className="size-4" />} onClick={() => navigate("/write")}>
          New article
        </ActionPill>
        <ActionPill icon={<Info className="size-4" />} to="/analytics">
          My analytics
        </ActionPill>
      </div>

      {mode === "supervised" ? (
        <section className="mb-5 rounded-2xl border border-warn/30 bg-warn-soft p-5" aria-labelledby="sup">
          <h2 id="sup" className="flex items-center gap-2 text-[15px] font-semibold text-warn">
            <ShieldAlert className="size-5" /> You are in supervision
          </h2>
          <p className="mt-1 text-[14px] text-ink">
            {actor.supervisionReason}. Auto-publishing is locked and every article needs {editor?.name ?? "an editor"}&apos;s approval first, whatever its urgency.
          </p>
          <p className="mt-3 text-[13px] font-medium">How to leave supervision</p>
          <ul className="mt-1 space-y-1 text-[13px]">
            <li>
              {SUPERVISION_RULES.improvement.cleanArticles} reviewed articles in a row with no major or critical mistakes:{" "}
              <b>
                {signal.cleanStreak}/{signal.needed}
              </b>
            </li>
            <li>
              At least {signal.daysNeeded} days served: <b>{signal.daysServed}</b>
            </li>
            <li>Then {editor?.name ?? "your editor"} lifts it with a note. It is never automatic.</li>
          </ul>
        </section>
      ) : (
        <p className="mb-5 rounded-xl border border-line bg-wash px-4 py-3 text-[13px] text-muted">
          <b className="text-ink">{mode === "auto" ? "Auto mode" : "Review mode"}.</b>{" "}
          {mode === "auto"
            ? "You publish directly. A post-publication check follows each article. Repeated or serious mistakes within 30 days move you into supervision, which locks auto until your editor lifts it."
            : `Your articles go to ${editor?.name ?? "an editor"} first. Ask them about auto mode.`}
        </p>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        <Card className="p-5">
          <CardTitle action={<Link to="/articles" className="text-[13px] font-medium text-brand hover:underline">All articles</Link>}>In review</CardTitle>
          <p className="text-[36px] leading-none tracking-tight">{inReview.length}</p>
          <ul className="mt-4 divide-y divide-line border-t border-line">
            {inReview.map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpenId(a.id)} className="flex w-full items-center justify-between gap-3 py-3 text-left hover:bg-wash">
                  <span className="min-w-0 truncate font-serif text-[14px] font-medium">{a.headline}</span>
                  <span className="shrink-0 text-[13px]">{a.cycle && <Countdown to={a.cycle.dueAt} className="font-medium" />}</span>
                </button>
              </li>
            ))}
            {inReview.length === 0 && <li className="py-6 text-[13px] text-muted">Nothing waiting on an editor.</li>}
          </ul>
        </Card>

        <Card className="p-5">
          <CardTitle>Feedback inbox</CardTitle>
          <ul className="divide-y divide-line">
            {feedback.map((a) => (
              <li key={a.id}>
                <button onClick={() => setOpenId(a.id)} className="w-full py-3 text-left hover:bg-wash">
                  <span className="flex items-center justify-between gap-2">
                    <span className="truncate font-serif text-[14px] font-medium">{a.headline}</span>
                    <StatusPill status={a.status} />
                  </span>
                  <span className="mt-1 block text-[12px] text-muted">
                    {a.threads.filter((t) => t.status === "open").length} open comments
                    {a.threads.some((t) => t.severity === "blocking" && t.status === "open") && " · blocking"}
                  </span>
                </button>
              </li>
            ))}
            {feedback.length === 0 && <li className="py-6 text-[13px] text-muted">No feedback waiting.</li>}
          </ul>
        </Card>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <Card className="p-5">
          <CardTitle action={<Pill tone={trigger.points > 0 ? "warn" : "good"}>{trigger.points} pts in 30 days</Pill>}>Quality trend</CardTitle>
          <BarsMini data={trend} label="Mistake points per week" />
          <p className="mt-2 text-[12px] text-muted">Minor 1, major 3, critical 6. This is for coaching, and only you and your editor see it.</p>
        </Card>
        <Card className="p-5">
          <CardTitle>Drafts and notices</CardTitle>
          <ul className="space-y-2 text-[13px]">
            {drafts.map((d) => (
              <li key={d.id}>
                <button onClick={() => setOpenId(d.id)} className="truncate font-serif font-medium hover:underline">
                  {d.headline}
                </button>
              </li>
            ))}
            {notices.map((n) => (
              <li key={n.id} className="rounded-lg bg-wash px-3 py-2">
                {n.body}
                <span className="block text-muted">
                  {getStaff(state, n.fromId)?.name} · {timeAgo(n.at)}
                </span>
              </li>
            ))}
            {drafts.length === 0 && notices.length === 0 && <li className="text-muted">Nothing here yet.</li>}
          </ul>
        </Card>
      </div>

      {openId && <ArticleDrawer articleId={openId} onClose={() => setOpenId(null)} />}
    </>
  );
}
