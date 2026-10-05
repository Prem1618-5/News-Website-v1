import { useState, type ReactNode } from "react";
import { Check, CircleAlert, FileText, MessageSquare, PencilLine } from "lucide-react";
import clsx from "clsx";
import { authorize } from "@/domain/capabilities";
import { runPreflight } from "@/domain/preflight";
import { STATUS_LABEL, URGENCY_LABEL, type Article, type Urgency, type Verdict } from "@/domain/types";
import {
  breakGlassPublish, canEditContent, canPublishDirect, completeCheck, effectiveMode, getStaff, publishNow, restoreArticle, setUrgency, submitArticle,
  takedownArticle, toggleHold, withdrawArticle,
} from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { Avatar, Button, Countdown, Drawer, Pill, SectionDot, inputCls, shortDate, timeAgo } from "@/components/ui/primitives";
import { ModePill, UrgencyPill } from "@/components/ui/badges";
import { PromptModal } from "@/components/ui/ConfirmDialog";
import { Composer } from "@/features/compose/Composer";

type Prompt = null | "hold" | "takedown" | "glass";

const noop = () => {};

export function ArticleDrawer({ articleId, onClose }: { articleId: string; onClose: () => void }) {
  const { state, actor, run } = useNewsroom();
  const a = state.articles.find((x) => x.id === articleId);
  const [prompt, setPrompt] = useState<Prompt>(null);
  const [composing, setComposing] = useState(false);
  if (!a) return null;

  const author = getStaff(state, a.authorId)!;
  const editor = author.editorId ? getStaff(state, author.editorId) : undefined;
  const mode = effectiveMode(author);
  const reviewable = a.status === "in_review" && !!a.cycle;
  const reviewDecision = authorize(actor, "article.review", { article: a, author });
  const isAuthor = a.authorId === actor.id;
  const claim = a.cycle?.claimedBy && (a.cycle.claimExpiresAt ?? 0) > Date.now() ? getStaff(state, a.cycle.claimedBy) : undefined;
  const pre = runPreflight(a);
  const direct = canPublishDirect(actor, state.settings);
  const edit = canEditContent(state, actor, a);
  const openThreads = a.threads.filter((t) => t.status === "open").length;

  const openLabel = !isAuthor && reviewable && reviewDecision.allowed ? "Review article" : edit.ok ? "Open and edit" : "Read article";

  const footer = isAuthor && ["draft", "changes_requested"].includes(a.status) ? (
    <div className="flex flex-wrap items-center justify-between gap-2">
      <Button variant="ghost" onClick={() => run((s, x) => withdrawArticle(s, x, a.id))}>
        Cancel article
      </Button>
      <div className="flex flex-wrap gap-2">
        {a.status === "draft" && direct.ok && <Button onClick={() => run((s, x) => publishNow(s, x, a.id))}>Publish now</Button>}
        <Button variant="primary" onClick={() => run((s, x) => submitArticle(s, x, a.id))}>
          {a.status === "changes_requested" ? "Send back to editor" : "Send to editor"}
        </Button>
      </div>
    </div>
  ) : undefined;

  return (
    <Drawer title={a.headline} onClose={composing ? noop : onClose} footer={footer}>
      <div className="space-y-6">
        <div>
          <div className="flex flex-wrap items-center gap-1.5">
            <UrgencyPill urgency={a.urgency} />
            <ModePill mode={mode} />
            {a.language === "hi" && <Pill>हिन्दी</Pill>}
            {a.hold && <Pill tone="warn">Paused</Pill>}
            {a.sensitivity && <Pill tone="bad">Needs legal check</Pill>}
            {a.publishedVia === "timeout" && <Pill tone="warn">Went live automatically</Pill>}
            {a.publishedVia === "admin_override" && <Pill tone="bad">Published without review</Pill>}
          </div>
          <p className="mt-3 text-[28px] leading-none tracking-tight">{reviewable && a.cycle ? <Countdown to={a.cycle.dueAt} /> : STATUS_LABEL[a.status]}</p>
          <p className="mt-1 text-[13px] text-muted">
            {reviewable ? "left for the editor to reply" : a.publishedAt ? `Published ${timeAgo(a.publishedAt)}` : `Updated ${timeAgo(a.updatedAt)}`}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <Button variant="primary" onClick={() => setComposing(true)} className="w-full">
            {edit.ok ? <PencilLine className="size-4" /> : <FileText className="size-4" />}
            {openLabel}
          </Button>
          <Button onClick={() => setComposing(true)} className="w-full">
            <MessageSquare className="size-4" />
            {openThreads ? `${openThreads} open comment${openThreads > 1 ? "s" : ""}` : "Comments and history"}
          </Button>
        </div>

        <dl className="divide-y divide-line rounded-xl border border-line text-[13px]">
          <Row label="Written by">
            <span className="flex min-w-0 items-center gap-2">
              <Avatar person={author} size={20} />
              <span className="truncate">{author.name}</span>
            </span>
          </Row>
          <Row label="Editor">{editor?.name ?? "Any available editor"}</Row>
          <Row label="Section">
            <SectionDot section={a.section} />
          </Row>
          {a.cycle && (
            <Row label="Sent to editor">
              {timeAgo(a.cycle.submittedAt)}
              {a.cycle.cycleNo > 1 ? ` · round ${a.cycle.cycleNo}` : ""}
            </Row>
          )}
          {reviewable && (
            <Row label="Being reviewed by">
              {claim ? claim.name : a.cycle?.poolOpen ? "Nobody yet · any editor can pick it up" : "Nobody yet"}
            </Row>
          )}
          {a.takedown && (
            <Row label="Removed from website">
              {getStaff(state, a.takedown.byId)?.name}: {a.takedown.reason}
            </Row>
          )}
          {a.hold && <Row label="Why it is paused">{a.holdNote}</Row>}
        </dl>

        <section aria-labelledby="pf">
          <h3 id="pf" className="mb-2 text-[13px] font-medium text-muted">
            Before it goes live
          </h3>
          <ul className="space-y-1.5">
            {pre.map((c) => (
              <li key={c.id} className="flex items-start gap-2 text-[13px]">
                {c.passed ? <Check className="mt-0.5 size-4 shrink-0 text-good" aria-label="Done" /> : <CircleAlert className="mt-0.5 size-4 shrink-0 text-warn" aria-label="To do" />}
                <span className="text-ink">
                  {c.label}
                  {!c.passed && c.detail && <span className="text-muted"> · {c.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        </section>

        {a.status === "published_pending_check" && (
          <section className="rounded-xl border border-line p-4">
            <h3 className="text-[14px] font-medium">Quick read after publishing</h3>
            <p className="mt-1 text-[13px] text-muted">
              {"It's live. An editor should read it once to confirm it's fine. "}
              {a.checkDueAt && a.checkDueAt > Date.now() ? (
                <>
                  Due in <Countdown to={a.checkDueAt} />
                </>
              ) : (
                "Due now."
              )}
            </p>
            {reviewDecision.allowed ? (
              <Button className="mt-3" variant="primary" onClick={() => run((s, x) => completeCheck(s, x, a.id))}>
                {"I've read it, all good"}
              </Button>
            ) : (
              <p className="mt-2 text-[13px] text-muted">{reviewDecision.reason}</p>
            )}
          </section>
        )}

        {a.verdicts.length > 0 && (
          <section aria-labelledby="vh">
            <h3 id="vh" className="mb-2 text-[13px] font-medium text-muted">
              Editor decisions
            </h3>
            <ul className="space-y-2">
              {a.verdicts.map((v) => (
                <li key={v.id} className="rounded-lg bg-wash px-3 py-2 text-[13px]">
                  <span className="font-medium">{VERDICT_LABEL[v.verdict]}</span> by {getStaff(state, v.byId)?.name} · {shortDate(v.at)}
                  {v.summary && <p className="mt-0.5 text-muted">{v.summary}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        <Controls article={a} onPrompt={setPrompt} />
      </div>

      {prompt === "hold" && (
        <PromptModal
          title={a.hold ? "Allow publishing again" : "Pause publishing"}
          label={a.hold ? "Note" : "Why are you pausing it?"}
          hint={
            a.hold
              ? "The article can go live again through the normal route."
              : "While paused, this article will not go live, not even automatically. The note is shown to the team."
          }
          confirmLabel={a.hold ? "Allow publishing" : "Pause publishing"}
          onConfirm={(t) => run((s, x) => toggleHold(s, x, a.id, t))}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === "takedown" && (
        <PromptModal
          title="Remove from the website"
          label="Why?"
          hint="Readers will no longer see it, in search or anywhere else. The writer is told. You can put it back later."
          confirmLabel="Remove from website"
          danger
          onConfirm={(t) => run((s, x) => takedownArticle(s, x, a.id, t))}
          onClose={() => setPrompt(null)}
        />
      )}
      {prompt === "glass" && (
        <PromptModal
          title="Publish without editor review"
          label="Why can't this wait for an editor?"
          hint="Only for emergencies, such as a court order or a safety warning. Other admins are told and it is recorded."
          confirmLabel="Publish now"
          danger
          minLength={10}
          onConfirm={(t) => run((s, x) => breakGlassPublish(s, x, a.id, t))}
          onClose={() => setPrompt(null)}
        />
      )}
      {composing && <Composer articleId={a.id} onClose={() => setComposing(false)} />}
    </Drawer>
  );
}

const VERDICT_LABEL: Record<Verdict, string> = {
  approve: "Approved",
  approve_with_notes: "Approved with notes",
  request_changes: "Edits requested",
  reject: "Declined",
};

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-4 px-3.5 py-2.5">
      <dt className="shrink-0 text-muted">{label}</dt>
      <dd className="min-w-0 text-right font-medium">{children}</dd>
    </div>
  );
}

function Controls({ article: a, onPrompt }: { article: Article; onPrompt: (p: Prompt) => void }) {
  const { state, actor, run } = useNewsroom();
  const author = getStaff(state, a.authorId)!;
  const canUrgency = authorize(actor, "article.set_urgency", { article: a }).allowed && ["in_review", "changes_requested", "draft"].includes(a.status);
  const canHold = authorize(actor, "article.hold", { article: a }).allowed;
  const canTakedown = authorize(actor, "article.takedown", { article: a, author }).allowed && !!a.publishedAt && a.status !== "unpublished";
  const canGlass = actor.role === "admin" && ["in_review", "changes_requested"].includes(a.status);
  if (!canUrgency && !canHold && !canTakedown && !canGlass && !(a.status === "unpublished" && a.takedown)) return null;
  return (
    <section aria-labelledby="ctl" className="space-y-3 border-t border-line pt-4">
      <h3 id="ctl" className="text-[13px] font-medium text-muted">
        More actions
      </h3>
      {canUrgency && (
        <label className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
          How urgent
          <select
            className={clsx(inputCls, "h-8! w-[170px]! text-[13px]!")}
            value={a.urgency}
            onChange={(e) => run((s, x) => setUrgency(s, x, a.id, Number(e.target.value) as Urgency))}
          >
            {([5, 4, 3, 2, 1] as Urgency[]).map((u) => (
              <option key={u} value={u}>
                {URGENCY_LABEL[u]}
              </option>
            ))}
          </select>
        </label>
      )}
      <div className="flex flex-wrap gap-2">
        {canHold && <Button size="sm" onClick={() => onPrompt("hold")}>{a.hold ? "Allow publishing" : "Pause publishing"}</Button>}
        {canTakedown && (
          <Button size="sm" variant="danger" onClick={() => onPrompt("takedown")}>
            Remove from website
          </Button>
        )}
        {a.status === "unpublished" && a.takedown && (
          <Button size="sm" onClick={() => run((s, x) => restoreArticle(s, x, a.id))}>
            Put back on website
          </Button>
        )}
        {canGlass && (
          <Button size="sm" variant="danger" onClick={() => onPrompt("glass")}>
            Publish without review
          </Button>
        )}
      </div>
    </section>
  );
}
