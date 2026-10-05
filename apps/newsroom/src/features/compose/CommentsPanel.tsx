import { useState } from "react";
import { Check, MessageSquarePlus, RotateCcw, X } from "lucide-react";
import clsx from "clsx";
import { blockLabel } from "@/domain/content";
import type { Article } from "@/domain/types";
import { addThread, getStaff, replyThread, setThreadStatus } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { Avatar, Button, Pill, Segmented, inputCls, textareaCls, timeAgo } from "@/components/ui/primitives";
import type { TextSelection } from "@/features/editor/ArticleEditor";

/**
 * Comments live next to the story. A reviewer selects words in the text, then writes a note
 * that stays attached to that passage.
 */
export function CommentsPanel({
  article,
  canComment,
  selection,
  onClearSelection,
  onJump,
}: {
  article: Article;
  canComment: boolean;
  selection: TextSelection | null;
  onClearSelection: () => void;
  onJump: (blockId: string) => void;
}) {
  const { state, actor, run } = useNewsroom();
  const [severity, setSeverity] = useState<"blocking" | "advisory">("advisory");
  const [body, setBody] = useState("");
  const [reply, setReply] = useState<Record<string, string>>({});
  const [showResolved, setShowResolved] = useState(false);
  const canResolve = article.authorId === actor.id || actor.role !== "reporter";
  const open = article.threads.filter((t) => t.status === "open");
  const visible = showResolved ? article.threads : open;

  const submit = () => {
    const ok = run((s, x) =>
      addThread(s, x, article.id, {
        blockLabel: selection ? blockLabel(article.body, selection.blockId) : "Whole article",
        blockId: selection?.blockId,
        quote: selection?.quote,
        severity,
        body,
      }),
    );
    if (ok) {
      setBody("");
      onClearSelection();
    }
  };

  return (
    <div className="space-y-4">
      {canComment && (
        <div className="space-y-2.5 rounded-xl border border-line bg-wash p-3">
          {selection ? (
            <div className="flex items-start gap-2">
              <p className="min-w-0 flex-1 border-l-2 border-warn pl-2 text-[13px] italic leading-snug text-muted">
                {`"${selection.quote.length > 140 ? `${selection.quote.slice(0, 139)}…` : selection.quote}"`}
              </p>
              <button onClick={onClearSelection} aria-label="Comment on the whole article instead" className="rounded p-0.5 text-faint hover:text-ink">
                <X className="size-4" />
              </button>
            </div>
          ) : (
            <p className="text-[12px] text-muted">Select words in the story to comment on them, or write a note about the whole article.</p>
          )}
          <textarea
            aria-label="Your comment"
            rows={3}
            className={textareaCls}
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder={selection ? "What should change here?" : "Note about the whole article"}
          />
          <div className="flex flex-wrap items-center justify-between gap-2">
            <Segmented
              label="Comment type"
              value={severity}
              onChange={setSeverity}
              items={[
                { id: "advisory", label: "Suggestion" },
                { id: "blocking", label: "Must fix" },
              ]}
            />
            <Button size="sm" variant="primary" onClick={submit} disabled={!body.trim()}>
              <MessageSquarePlus className="size-4" /> Comment
            </Button>
          </div>
          {severity === "blocking" && <p className="text-[12px] text-muted">{"The article can't go live until this is marked done."}</p>}
        </div>
      )}

      <div className="flex items-center justify-between">
        <p className="text-[13px] font-medium text-ink">
          {open.length} open {open.length === 1 ? "comment" : "comments"}
        </p>
        {article.threads.length > open.length && (
          <button className="text-[12px] text-muted underline-offset-2 hover:underline" onClick={() => setShowResolved((v) => !v)}>
            {showResolved ? "Hide done" : `Show done (${article.threads.length - open.length})`}
          </button>
        )}
      </div>

      {visible.length === 0 && <p className="text-[13px] text-muted">Nothing to fix right now.</p>}

      <ul className="space-y-3">
        {visible.map((t) => (
          <li key={t.id} className={clsx("rounded-xl border border-line bg-white p-3", t.status === "resolved" && "opacity-70")}>
            <div className="mb-2 flex flex-wrap items-center gap-1.5">
              <Pill tone={t.severity === "blocking" ? "bad" : "neutral"}>{t.severity === "blocking" ? "Must fix" : "Suggestion"}</Pill>
              {t.blockId ? (
                <button className="text-[12px] text-brand underline-offset-2 hover:underline" onClick={() => onJump(t.blockId!)}>
                  {t.blockLabel}
                </button>
              ) : (
                <span className="text-[12px] text-muted">{t.blockLabel}</span>
              )}
              {t.status === "resolved" && <Pill tone="good">Done</Pill>}
            </div>
            {t.quote && <p className="mb-2 border-l-2 border-warn pl-2 text-[13px] italic leading-snug text-muted">{`"${t.quote}"`}</p>}
            <ul className="space-y-2">
              {t.comments.map((c) => {
                const who = getStaff(state, c.authorId);
                return (
                  <li key={c.id} className="flex gap-2">
                    <Avatar person={who} size={22} />
                    <div className="min-w-0 flex-1 text-[13px] leading-snug">
                      <p>
                        <span className="font-medium">{who?.name}</span> <span className="text-faint">{timeAgo(c.at)}</span>
                      </p>
                      <p className="text-ink">{c.body}</p>
                    </div>
                  </li>
                );
              })}
            </ul>
            <div className="mt-2.5 flex items-center gap-2">
              <input
                aria-label="Reply"
                placeholder="Reply"
                className={clsx(inputCls, "h-8! text-[13px]!")}
                value={reply[t.id] ?? ""}
                onChange={(e) => setReply((r) => ({ ...r, [t.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.nativeEvent.isComposing && e.keyCode !== 229) {
                    if (run((s, x) => replyThread(s, x, article.id, t.id, reply[t.id] ?? ""))) setReply((r) => ({ ...r, [t.id]: "" }));
                  }
                }}
              />
              {canResolve && (
                <Button size="sm" onClick={() => run((s, x) => setThreadStatus(s, x, article.id, t.id, t.status === "open" ? "resolved" : "open"))}>
                  {t.status === "open" ? <Check className="size-4" /> : <RotateCcw className="size-4" />}
                  {t.status === "open" ? "Done" : "Reopen"}
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
