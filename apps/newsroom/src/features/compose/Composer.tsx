import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ArrowLeft, Lock, MessageSquarePlus, PanelRight, PencilLine, Send, X } from "lucide-react";
import clsx from "clsx";
import { derivePreflight, readingMinutes, wordCount, bodyText } from "@/domain/content";
import { runPreflight } from "@/domain/preflight";
import type { ArticleBlock } from "@/domain/types";
import { authorize } from "@/domain/capabilities";
import { canEditContent, canPublishDirect, createArticle, getStaff, publishNow, submitArticle, updateArticle } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";
import { Button, Tabs } from "@/components/ui/primitives";
import type { TextSelection } from "@/features/editor/ArticleEditor";
import { MediaCard } from "@/features/editor/MediaCard";
import { AiAssist } from "./AiAssist";
import { ActivityTimeline } from "./ActivityTimeline";
import { CommentsPanel } from "./CommentsPanel";
import { DetailsPanel } from "./DetailsPanel";
import { ReviewPanel } from "./ReviewPanel";
import { draftFromArticle, emptyDraft, inputFromDraft, patchFromDraft, type ComposerDraft } from "./draft";

const ArticleEditor = lazy(() => import("@/features/editor/ArticleEditor"));

type Tab = "details" | "comments" | "history" | "review";
type SaveState = "idle" | "pending" | "saved";

/**
 * One writing surface for everyone: reporters draft here, and editors review in the same view,
 * commenting on selected words or fixing small mistakes directly.
 */
export function Composer({ articleId, onClose }: { articleId?: string; onClose: () => void }) {
  const { state, actor, run, can } = useNewsroom();
  const article = articleId ? state.articles.find((a) => a.id === articleId) : undefined;
  const isNew = !articleId;

  const [draft, setDraft] = useState<ComposerDraft>(() => (article ? draftFromArticle(article) : emptyDraft()));
  const draftRef = useRef(draft);
  const savedDraft = useRef(draft);
  const bodyRef = useRef<ArticleBlock[]>(article?.body ?? []);
  const bodyDirty = useRef(false);
  const timer = useRef<number | undefined>(undefined);
  const [bodyVersion, setBodyVersion] = useState(0);
  const [saveState, setSaveState] = useState<SaveState>("idle");
  const [selection, setSelection] = useState<TextSelection | null>(null);
  const [focusBlockId, setFocusBlockId] = useState<string>();
  const [panelOpen, setPanelOpen] = useState(false);

  const author = article ? getStaff(state, article.authorId) : actor;
  const edit = article ? canEditContent(state, actor, article) : { ok: can("article.create"), asEditor: false, reason: undefined };
  const reviewDecision = article ? authorize(actor, "article.review", { article, author }) : { allowed: false };
  const isReviewer = !!article && article.authorId !== actor.id && reviewDecision.allowed;
  const canComment = isReviewer && article?.status === "in_review";

  const [tab, setTab] = useState<Tab>(() => (isReviewer && article?.status === "in_review" ? "review" : article?.threads.some((t) => t.status === "open") ? "comments" : "details"));

  const flush = useCallback(() => {
    window.clearTimeout(timer.current);
    if (!articleId) return;
    const patch = patchFromDraft(savedDraft.current, draftRef.current);
    if (bodyDirty.current) patch.body = bodyRef.current;
    if (!Object.keys(patch).length) return;
    const pendingDraft = draftRef.current;
    if (run((s, x) => updateArticle(s, x, articleId, patch, { quiet: true }))) {
      savedDraft.current = pendingDraft;
      bodyDirty.current = false;
      setSaveState("saved");
    } else setSaveState("idle");
  }, [articleId, run]);

  const schedule = useCallback(() => {
    if (!articleId) return;
    setSaveState("pending");
    window.clearTimeout(timer.current);
    timer.current = window.setTimeout(flush, 900);
  }, [articleId, flush]);

  useEffect(() => () => flush(), [flush]);

  const change = (patch: Partial<ComposerDraft>) => {
    const next = { ...draftRef.current, ...patch };
    draftRef.current = next;
    setDraft(next);
    schedule();
  };

  const onBodyChange = (blocks: ArticleBlock[]) => {
    bodyRef.current = blocks;
    bodyDirty.current = true;
    setBodyVersion((v) => v + 1);
    schedule();
  };

  const checks = useMemo(() => {
    if (article) return runPreflight(article);
    const preflight = derivePreflight({ hero: draft.hero, body: bodyRef.current, section: draft.section, authorId: actor.id, slug: draft.slug || "new" });
    return runPreflight({ headline: draft.headline, preflight, threads: [], hold: false });
  }, [article, draft, actor.id, bodyVersion]);

  const words = useMemo(() => wordCount(bodyText(bodyRef.current)), [bodyVersion]);

  const jumpTo = (blockId: string) => {
    setFocusBlockId(blockId);
    setPanelOpen(false);
    document.querySelector(`.news-editor .bn-block-outer[data-id="${CSS.escape(blockId)}"]`)?.scrollIntoView({ behavior: "smooth", block: "center" });
    window.setTimeout(() => setFocusBlockId((id) => (id === blockId ? undefined : id)), 2400);
  };

  const close = () => {
    flush();
    onClose();
  };

  const saveNew = () => {
    if (run((s, x) => createArticle(s, x, inputFromDraft(draftRef.current, bodyRef.current)))) onClose();
  };

  const direct = canPublishDirect(actor, state.settings);
  const authorActions = article && article.authorId === actor.id && ["draft", "changes_requested"].includes(article.status);
  const openThreads = article?.threads.filter((t) => t.status === "open") ?? [];
  const highlightIds = openThreads.map((t) => t.blockId).filter((x): x is string => !!x);

  const tabs: { id: Tab; label: string; count?: number }[] = [
    ...(isReviewer && article?.status === "in_review" ? [{ id: "review" as const, label: "Review" }] : []),
    { id: "details", label: "Details" },
    ...(article ? [{ id: "comments" as const, label: "Comments", count: openThreads.length }, { id: "history" as const, label: "History", count: article.activity?.length ?? 0 }] : []),
  ];

  const modeLabel = isNew ? "New article" : isReviewer ? (edit.ok ? "Reviewing" : "Reading") : edit.ok ? "Editing" : "Viewing";
  const hi = draft.language === "hi";

  const panel = (
    <div className="flex h-full flex-col">
      <div className="flex items-center justify-between gap-2 border-b border-line px-4 py-3">
        <Tabs label="Article panels" value={tab} onChange={setTab} items={tabs} />
        <button onClick={() => setPanelOpen(false)} aria-label="Close panel" className="rounded-md p-1 text-muted hover:bg-wash lg:hidden">
          <X className="size-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-4">
        {tab === "details" && (
          <div className="space-y-6">
            {edit.ok && (
              <AiAssist
                getText={() => `${draftRef.current.headline}\n${bodyText(bodyRef.current)}`}
                language={draft.language}
                onHeadline={(headline) => change({ headline })}
                onSummary={(standfirst) => change({ standfirst })}
              />
            )}
            <DetailsPanel draft={draft} onChange={change} editable={edit.ok} checks={checks} />
          </div>
        )}
        {tab === "comments" && article && (
          <CommentsPanel article={article} canComment={canComment} selection={selection} onClearSelection={() => setSelection(null)} onJump={jumpTo} />
        )}
        {tab === "history" && article && <ActivityTimeline entries={article.activity ?? []} onJump={jumpTo} />}
        {tab === "review" && article && <ReviewPanel article={article} />}
      </div>
    </div>
  );

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={`${modeLabel}: ${draft.headline || "Untitled"}`} className="fixed inset-0 z-50 flex flex-col bg-white">
      <header className="flex h-14 shrink-0 items-center gap-2 border-b border-line px-2 sm:gap-3 sm:px-4">
        <button onClick={close} className="inline-flex h-9 items-center gap-1.5 rounded-lg px-2 text-[14px] font-medium text-muted hover:bg-wash hover:text-ink">
          <ArrowLeft className="size-4" aria-hidden="true" />
          <span className="hidden sm:inline">Back</span>
          <span className="sr-only sm:hidden">Back</span>
        </button>
        <div className="min-w-0 flex-1 leading-tight">
          <p className="text-[12px] text-muted">
            {modeLabel}
            {author && !isNew && author.id !== actor.id ? ` · by ${author.name}` : ""}
          </p>
          <p className={clsx("truncate text-[14px] font-medium text-ink", hi && "lang-hi")}>{draft.headline || "Untitled article"}</p>
        </div>
        <p className="hidden shrink-0 text-[12px] text-muted md:block" aria-live="polite">
          {isNew ? `${words} words` : saveState === "pending" ? "Saving..." : saveState === "saved" ? "All changes saved" : `${words} words · ${readingMinutes(bodyRef.current, draft.language)} min read`}
        </p>
        <Button variant="ghost" className="lg:hidden" onClick={() => setPanelOpen(true)} aria-label="Open article panel">
          <PanelRight className="size-4" />
          {openThreads.length > 0 && <span className="rounded-full bg-brand px-1.5 text-[11px] text-white">{openThreads.length}</span>}
        </Button>
        {isNew && (
          <Button variant="primary" onClick={saveNew} disabled={!edit.ok}>
            Save draft
          </Button>
        )}
        {authorActions && article && (
          <>
            {article.status === "draft" && direct.ok && (
              <Button
                className="hidden sm:inline-flex"
                onClick={() => {
                  flush();
                  if (run((s, x) => publishNow(s, x, article.id))) onClose();
                }}
              >
                Publish now
              </Button>
            )}
            <Button
              variant="primary"
              onClick={() => {
                flush();
                if (run((s, x) => submitArticle(s, x, article.id))) onClose();
              }}
            >
              <Send className="size-4" aria-hidden="true" />
              <span>{article.status === "changes_requested" ? "Send back" : "Send to editor"}</span>
            </Button>
          </>
        )}
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="relative min-w-0 flex-1 overflow-y-auto">
          <div className="mx-auto w-full max-w-[760px] px-4 pb-32 pt-6 sm:px-8 sm:pt-10">
            {article && !edit.ok && edit.reason && (
              <p className="mb-6 flex items-start gap-2 rounded-xl bg-wash px-3.5 py-3 text-[13px] text-muted">
                <Lock className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {edit.reason}
                  {canComment && " You can still select text and leave comments."}
                </span>
              </p>
            )}
            {article && edit.ok && edit.asEditor && (
              <p className="mb-6 flex items-start gap-2 rounded-xl bg-brand-soft px-3.5 py-3 text-[13px] text-brand-deep">
                <PencilLine className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                <span>
                  {`You can fix small mistakes directly. Each fix is saved and shown to ${author?.name ?? "the reporter"} in History. For bigger changes, select the text and comment.`}
                </span>
              </p>
            )}

            <div lang={draft.language} className={clsx("space-y-3", hi && "lang-hi")}>
              <label className="sr-only" htmlFor="c-kicker">
                Label
              </label>
              <input
                id="c-kicker"
                value={draft.kicker}
                readOnly={!edit.ok}
                onChange={(e) => change({ kicker: e.target.value })}
                placeholder={hi ? "लेबल, जैसे लाइव या विश्लेषण" : "Label, e.g. Live, Analysis"}
                className="w-full bg-transparent text-[13px] font-semibold uppercase tracking-wide text-brand placeholder:font-medium placeholder:normal-case placeholder:tracking-normal placeholder:text-faint focus:outline-none"
              />
              <label className="sr-only" htmlFor="c-headline">
                Headline
              </label>
              <textarea
                id="c-headline"
                rows={1}
                value={draft.headline}
                readOnly={!edit.ok}
                onChange={(e) => change({ headline: e.target.value.replace(/\n/g, " ") })}
                placeholder={hi ? "शीर्षक" : "Headline"}
                className="field-sizing-content w-full resize-none bg-transparent font-serif text-[30px] font-medium leading-[1.15] tracking-tight text-ink placeholder:text-faint focus:outline-none sm:text-[38px]"
              />
              <label className="sr-only" htmlFor="c-standfirst">
                Summary
              </label>
              <textarea
                id="c-standfirst"
                rows={1}
                value={draft.standfirst}
                readOnly={!edit.ok}
                onChange={(e) => change({ standfirst: e.target.value })}
                placeholder={hi ? "एक-दो वाक्यों में बताएं कि यह खबर क्यों ज़रूरी है" : "One or two sentences on why this matters to readers"}
                className="field-sizing-content w-full resize-none bg-transparent text-[18px] leading-relaxed text-muted placeholder:text-faint focus:outline-none"
              />
            </div>

            <div className="mt-6">
              <MediaCard
                label="Featured photo or video"
                value={draft.hero}
                editable={edit.ok}
                onChange={(hero) => change({ hero })}
                onRemove={() => change({ hero: undefined })}
              />
            </div>

            <div className="-mx-4 mt-8 border-t border-line pt-6 sm:-mx-[54px]">
              <Suspense fallback={<EditorSkeleton />}>
                <ArticleEditor
                  key={`${articleId ?? "new"}-${edit.ok}`}
                  initialBlocks={bodyRef.current}
                  language={draft.language}
                  editable={edit.ok}
                  onChange={onBodyChange}
                  onSelect={canComment ? setSelection : undefined}
                  highlightBlockIds={highlightIds}
                  focusBlockId={focusBlockId}
                />
              </Suspense>
            </div>
          </div>

          {canComment && selection && (
            <div className="pointer-events-none sticky bottom-6 flex justify-center px-4">
              <button
                onClick={() => {
                  setTab("comments");
                  setPanelOpen(true);
                }}
                className="pointer-events-auto inline-flex max-w-full items-center gap-2 rounded-full bg-ink px-4 py-2.5 text-[14px] font-medium text-white shadow-lg hover:bg-ink/90"
              >
                <MessageSquarePlus className="size-4 shrink-0" aria-hidden="true" />
                <span className="truncate">{`Comment on "${selection.quote.length > 40 ? `${selection.quote.slice(0, 39)}…` : selection.quote}"`}</span>
              </button>
            </div>
          )}
        </main>

        <aside className="hidden w-[360px] shrink-0 border-l border-line bg-[#fbfbfd] lg:block">{panel}</aside>
        {panelOpen && (
          <div className="fixed inset-0 z-10 lg:hidden">
            <button aria-label="Close panel" className="absolute inset-0 bg-ink/30" onClick={() => setPanelOpen(false)} />
            <div className="drawer-in absolute inset-y-0 right-0 w-full max-w-[380px] bg-[#fbfbfd] shadow-xl">{panel}</div>
          </div>
        )}
      </div>
    </div>,
    document.body,
  );
}

function EditorSkeleton() {
  return (
    <div className="space-y-3 px-[54px]" aria-hidden="true">
      <div className="h-4 w-11/12 animate-pulse rounded bg-wash" />
      <div className="h-4 w-10/12 animate-pulse rounded bg-wash" />
      <div className="h-4 w-8/12 animate-pulse rounded bg-wash" />
    </div>
  );
}
