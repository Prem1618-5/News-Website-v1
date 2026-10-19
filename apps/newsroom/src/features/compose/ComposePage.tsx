/**
 * One screen for writing, reviewing and publishing a story, built for a phone first.
 *
 * The writer sees: photo, headline, subheading, text, and one button (Publish, or Send to editor). The
 * editor sees the same story with highlights they can add, can edit it directly (the writer is told and can
 * see exactly what changed), and approves with the same one-sheet publish step.
 */
import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import type { Editor } from "@tiptap/react";
import {
  ArrowLeft, Check, CloudOff, ExternalLink, Eye, History, Languages, Loader2, MessageSquareText, MoreHorizontal, RotateCcw,
  Send, SlidersHorizontal, Sparkles, Trash2, Undo2, X,
} from "lucide-react";
import clsx from "clsx";
import {
  checkArticle, deleteArticle, markSeen, publishArticle, refreshLists, reopenArticle, rejectArticle, returnArticle, submitArticle,
  unpublishArticle, useArticle,
} from "@/api/desk";
import { runAi, useAiStatus } from "@/api/ai";
import { errorText } from "@/api/http";
import { homePlace, targetLabel } from "@/domain/places";
import { ROLE_LABEL, SECTION_KEYS, SECTION_LABEL, isSenior, type Article, type Lang, type NoteKind, type SectionKey } from "@/domain/types";
import { useSession } from "@/state/session";
import { BreakingPill, StatusPill } from "@/components/ui/badges";
import { Button, Drawer, Modal, Segmented, Spinner, Tabs, selectCls, textareaCls, timeAgo } from "@/components/ui/primitives";
import { Menu, MenuItem } from "@/features/editor/Menu";
import { docText, emptyDoc, isEmptyDoc, wordCount } from "@/features/editor/tools";
import { ChangesView } from "./ChangesView";
import { HeroPicker } from "./HeroPicker";
import { HistoryGraph } from "./HistoryGraph";
import { NoteBar, NoteDialog, NotesPanel, createNote } from "./notes";
import { PublishSheet, type SendChoice, type SendMode } from "./PublishSheet";
import { useAutosave, type Fields, type SaveState } from "./useAutosave";

const StoryEditor = lazy(() => import("@/features/editor/StoryEditor"));

const pendingDelete = new Map<string, number>();

const LANG_NAME: Record<Lang, string> = { en: "English", hi: "हिन्दी" };
const t = (lang: Lang, en: string, hi: string) => (lang === "hi" ? hi : en);

export default function ComposePage() {
  const { id } = useParams();
  const { data: article, error, mutate } = useArticle(id);
  const [reload, setReload] = useState(0);

  if (error && !article) {
    return (
      <main className="flex min-h-dvh flex-col items-center justify-center gap-3 px-6 text-center">
        <p className="text-[16px] font-medium">{(error as { status?: number }).status === 404 ? "This story does not exist, or you cannot open it." : errorText(error)}</p>
        <Link to="/" className="text-[14px] font-medium text-brand hover:underline">Back to the desk</Link>
      </main>
    );
  }
  if (!article) {
    return (
      <div role="status" className="flex min-h-dvh items-center justify-center gap-2 text-[14px] text-muted">
        <Loader2 className="size-4 animate-spin" aria-hidden="true" /> Opening the story
      </div>
    );
  }
  return (
    <Composer
      key={`${article.id}:${reload}`}
      article={article}
      setArticle={(a) => void mutate(a, { revalidate: false })}
      revalidate={() => void mutate()}
      reload={async () => {
        await mutate();
        setReload((r) => r + 1);
      }}
    />
  );
}

type Panel = "notes" | "history" | "details";

function Composer({ article, setArticle, revalidate, reload }: { article: Article; setArticle: (a: Article) => void; revalidate: () => void; reload: () => Promise<void> }) {
  const navigate = useNavigate();
  const { me, toast } = useSession();
  const ai = useAiStatus();
  const own = article.author.id === me.id;
  const senior = isSenior(me);
  const editable = article.can.edit;

  const save = useAutosave(article, {
    onSaved: setArticle,
    onConflict: () => {
      toast("Someone else changed this story. You now see the latest version.", "error");
      void reload();
    },
    onError: (m) => toast(m, "error"),
  });
  const [fields, setFields] = useState<Fields>(save.initialFields);
  const set = (patch: Partial<Fields>, delay?: number) => {
    setFields((f) => ({ ...f, ...patch }));
    save.change(patch, delay);
  };

  const [lang, setLang] = useState<Lang>(article.primary_language);
  const [editorKey, setEditorKey] = useState(0);
  const editorRef = useRef<Editor | null>(null);
  const [editor, setEditor] = useState<Editor | null>(null);
  const onReady = useCallback((e: Editor | null) => {
    editorRef.current = e;
    setEditor(e);
  }, []);

  const [panel, setPanel] = useState<Panel>(() => (article.notes.some((n) => n.status === "open") ? "notes" : senior && !own ? "notes" : "details"));
  const [panelOpen, setPanelOpen] = useState(false);
  const [sheet, setSheet] = useState<SendMode | null>(null);
  const [busy, setBusy] = useState(false);
  const [prompt, setPrompt] = useState<null | "return" | "reject" | "unpublish">(null);
  const [noteDraft, setNoteDraft] = useState<{ kind: NoteKind; quote: string; range: { from: number; to: number } } | null>(null);
  const [changesOpen, setChangesOpen] = useState(false);
  const [translating, setTranslating] = useState(false);

  const has = (l: Lang) => !!fields[`headline_${l}`].trim() || !isEmptyDoc(save.draft.current[`body_${l}`]);
  const other: Lang = lang === "en" ? "hi" : "en";
  const createdHere = useRef(new URLSearchParams(window.location.search).has("new"));

  // A brand-new story left without a word or a photo is cleaned up instead of piling up as an empty draft.
  // The delete waits a moment so a remount (React's development double-mount, a quick back-and-forth)
  // cancels it.
  useEffect(() => {
    window.clearTimeout(pendingDelete.get(article.id));
    return () => {
      const d = save.draft.current;
      if (createdHere.current && !d.headline_en.trim() && !d.headline_hi.trim() && isEmptyDoc(d.body_en) && isEmptyDoc(d.body_hi) && !d.hero?.src) {
        pendingDelete.set(
          article.id,
          window.setTimeout(() => void deleteArticle(article.id).then(refreshLists).catch(() => {}), 1500),
        );
      }
    };
  }, [article.id, save.draft]);

  const home = homePlace(own ? me : { homeState: article.state, homeDistrict: article.district });

  // ------------------------------------------------------------ actions

  const after = (a: Article, message: string) => {
    save.adopt(a);
    setArticle(a);
    refreshLists();
    toast(message, "success");
  };

  const run = async (fn: () => Promise<Article>, message: string) => {
    setBusy(true);
    try {
      if (editable && !(await save.flush())) return;
      after(await fn(), message);
      return true;
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };

  const send = async (choice: SendChoice) => {
    const mode = sheet;
    const ok = await run(async () => {
      const body = { ...choice, version: save.version.current };
      return mode === "submit" ? submitArticle(article.id, body) : publishArticle(article.id, body);
    }, mode === "submit" ? (choice.priority === "breaking" ? "Sent as breaking news. Every editor has been told." : "Sent to your editor.") : "Published. It is on the site now.");
    if (ok) {
      setSheet(null);
      if (mode === "approve") navigate("/review");
    }
  };

  const checks = useMemo(() => {
    const words = wordCount(docText(save.draft.current.body_en)) + wordCount(docText(save.draft.current.body_hi));
    const openProblems = article.notes.filter((n) => n.status === "open" && n.kind === "problem").length;
    const list = [
      { ok: has("en") || has("hi"), label: "Headline", required: true },
      { ok: words >= 15 || !!fields.hero?.src, label: "A few lines of text or a photo", required: true },
      { ok: !!fields.hero?.src, label: "Main photo or video" },
    ];
    if (fields.hero?.src) list.push({ ok: !!fields.hero.credit.trim(), label: "Photo credit" });
    if (openProblems) list.push({ ok: false, label: `${openProblems} highlighted problem${openProblems > 1 ? "s" : ""} still open`, required: own && sheet !== "approve" });
    if (fields.unproofed.length) list.push({ ok: false, label: `AI-drafted ${fields.unproofed.map((l) => LANG_NAME[l]).join(", ")} not checked yet` });
    return list;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fields, article.notes, own, sheet]);

  const translate = async () => {
    if (translating) return;
    const from = lang;
    const to = other;
    setTranslating(true);
    try {
      const [h, s, b] = await Promise.all([
        fields[`headline_${from}`].trim() ? runAi("translate", fields[`headline_${from}`], from, to) : null,
        fields[`standfirst_${from}`].trim() ? runAi("translate", fields[`standfirst_${from}`], from, to) : null,
        docText(save.draft.current[`body_${from}`]).trim() ? runAi("translate", docText(save.draft.current[`body_${from}`]), from, to) : null,
      ]);
      const paragraphs = (b?.output ?? "").split(/\n{2,}|\n/).map((p) => p.trim()).filter(Boolean);
      set(
        {
          [`headline_${to}`]: (h?.output ?? "").replace(/^["“]|["”]$/g, ""),
          [`standfirst_${to}`]: s?.output ?? "",
          [`body_${to}`]: paragraphs.length ? { type: "doc", content: paragraphs.map((p) => ({ type: "paragraph", content: [{ type: "text", text: p }] })) } : emptyDoc(),
          unproofed: [...new Set([...fields.unproofed, to])],
        } as Partial<Fields>,
        200,
      );
      setLang(to);
      setEditorKey((k) => k + 1);
      toast(t(to, "Draft ready. Read it through before publishing.", "ड्राफ़्ट तैयार है। प्रकाशित करने से पहले पढ़ लें।"));
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setTranslating(false);
    }
  };

  const addNoteFromSelection = (kind: NoteKind, quote: string, range: { from: number; to: number }) => setNoteDraft({ kind, quote, range });

  // ------------------------------------------------------------ header actions

  const primary = (() => {
    if (article.can.review) return { label: "Approve", icon: Check, onClick: () => setSheet("approve") };
    if (article.can.publish) return { label: "Publish", icon: Send, onClick: () => setSheet("publish") };
    if (article.can.submit) return { label: article.status === "changes_requested" ? "Send back" : "Send", icon: Send, onClick: () => setSheet("submit") };
    if (article.can.check) return { label: "Looks good", icon: Check, onClick: () => void run(() => checkArticle(article.id), "Marked as checked.") };
    if (article.can.reopen) return { label: "Reopen", icon: RotateCcw, onClick: () => void run(() => reopenArticle(article.id), "Back to a draft.") };
    return null;
  })();

  const storyUrl = article.status === "published" && article.slug ? `${import.meta.env.VITE_READER_URL ?? ""}/${article.primary_language === "hi" && article.languages.length > 1 ? "hi/" : ""}story/${article.slug}` : "";

  const panelBody = (
    <div className="space-y-4">
      <Tabs
        label="Story panels"
        value={panel}
        onChange={setPanel}
        items={[
          { id: "notes", label: "Notes", count: article.notes.filter((n) => n.status === "open").length },
          { id: "history", label: "History" },
          { id: "details", label: "Details" },
        ]}
      />
      {panel === "notes" && <NotesPanel article={article} me={me} editor={editor} editorLang={lang} onChanged={revalidate} toast={toast} />}
      {panel === "history" && <HistoryGraph articleId={article.id} version={article.version} />}
      {panel === "details" && (
        <Details
          fields={fields}
          article={article}
          editable={editable}
          onChange={(p) => set(p, 400)}
        />
      )}
    </div>
  );

  // ------------------------------------------------------------ render

  return (
    <div className="flex min-h-dvh flex-col bg-white">
      <header className="sticky top-0 z-30 flex h-[56px] items-center gap-2 border-b border-line bg-white/95 px-2 backdrop-blur sm:px-4">
        <button type="button" onClick={() => (window.history.length > 1 ? navigate(-1) : navigate("/"))} aria-label="Back" className="flex size-10 items-center justify-center rounded-lg text-muted hover:bg-wash hover:text-ink">
          <ArrowLeft className="size-5" aria-hidden="true" />
        </button>
        <div className="flex min-w-0 flex-1 items-center gap-2">
          <StatusPill status={article.status} />
          <BreakingPill priority={article.priority} />
          <SaveBadge state={editable ? save.state : "saved"} hidden={!editable} />
        </div>
        {article.can.review && (
          <Button size="sm" className="max-sm:hidden" onClick={() => setPrompt("return")}>
            <Undo2 className="size-4" aria-hidden="true" /> Send back
          </Button>
        )}
        {storyUrl && (
          <a href={storyUrl} target="_blank" rel="noreferrer" className="inline-flex h-8 items-center gap-1 rounded-lg px-2 text-[13px] font-medium text-brand hover:bg-brand-soft">
            <ExternalLink className="size-4" aria-hidden="true" /> <span className="max-sm:hidden">View</span>
          </a>
        )}
        {primary && (
          <Button variant="primary" onClick={primary.onClick} disabled={busy} className={clsx(article.priority === "breaking" && primary.label !== "Looks good" && "bg-bad! hover:bg-bad/90!")}>
            {busy ? <Spinner /> : <primary.icon className="size-4" aria-hidden="true" />}
            {primary.label}
          </Button>
        )}
        <Menu label="More actions" align="right" button={<MoreHorizontal className="size-5" aria-hidden="true" />}>
          {(close) => (
            <>
              {article.can.review && <MenuItem onClick={() => (close(), setPrompt("return"))}>Send back with notes</MenuItem>}
              {article.can.review && <MenuItem onClick={() => (close(), setPrompt("reject"))}>Decline the story</MenuItem>}
              {article.can.unpublish && <MenuItem onClick={() => (close(), setPrompt("unpublish"))}>Take off the site</MenuItem>}
              <MenuItem onClick={() => (close(), setPanel("history"), setPanelOpen(true))}>History of changes</MenuItem>
              {article.senior_edits > 0 && <MenuItem onClick={() => (close(), setChangesOpen(true))}>What the editor changed</MenuItem>}
              {article.can.delete && (
                <MenuItem
                  onClick={() => {
                    close();
                    if (!window.confirm("Delete this draft? This cannot be undone.")) return;
                    createdHere.current = false;
                    void deleteArticle(article.id)
                      .then(() => (refreshLists(), toast("Draft deleted."), navigate("/stories")))
                      .catch((e) => toast(errorText(e), "error"));
                  }}
                >
                  <span className="flex items-center gap-2 text-bad"><Trash2 className="size-4" /> Delete draft</span>
                </MenuItem>
              )}
            </>
          )}
        </Menu>
      </header>

      <div className="flex min-h-0 flex-1">
        <main className="min-w-0 flex-1 pb-28">
          <div className="mx-auto max-w-[720px] px-4 pt-4 sm:px-6">
            <Banners article={article} own={own} onChanges={() => setChangesOpen(true)} onNotes={() => (setPanel("notes"), setPanelOpen(true))} />

            {/* Language versions */}
            <div className="mb-4 flex flex-wrap items-center gap-2">
              {(["en", "hi"] as const)
                .filter((l) => l === lang || has(l) || l === article.primary_language)
                .map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => setLang(l)}
                    aria-pressed={lang === l}
                    className={clsx("inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium", lang === l ? "bg-ink text-white" : "border border-line text-muted hover:bg-wash")}
                  >
                    {LANG_NAME[l]}
                    {l === fields.primary_language && <span className={clsx("text-[11px]", lang === l ? "text-white/70" : "text-faint")}>main</span>}
                    {fields.unproofed.includes(l) && <span className="size-1.5 rounded-full bg-warn" aria-label="not checked yet" />}
                  </button>
                ))}
              {!has(other) && lang !== other && editable && (
                <button type="button" onClick={() => setLang(other)} className="inline-flex h-8 items-center gap-1.5 rounded-full border border-dashed border-line px-3 text-[13px] text-muted hover:border-brand hover:text-brand">
                  <Languages className="size-4" aria-hidden="true" /> Add {LANG_NAME[other]} version
                </button>
              )}
            </div>

            {lang !== fields.primary_language && !has(lang) && editable && (
              <div className="mb-4 rounded-xl border border-line bg-wash px-4 py-3 text-[13.5px]">
                <p className="font-medium">{t(lang, "Optional: an English version of this story.", "वैकल्पिक: इस ख़बर का हिन्दी संस्करण।")}</p>
                <p className="mt-0.5 text-muted">
                  {t(lang, "Readers who chose English will see it. Write it yourself", "हिन्दी चुनने वाले पाठक इसे देखेंगे। ख़ुद लिखें")}
                  {ai.enabled ? t(lang, ", or start from a machine draft and check it.", " या मशीन ड्राफ़्ट से शुरू करके जाँच लें।") : "."}
                </p>
                {ai.enabled && (
                  <Button size="sm" className="mt-2" onClick={() => void translate()} disabled={translating || !has(other)}>
                    {translating ? <Spinner /> : <Sparkles className="size-4" aria-hidden="true" />}
                    {t(lang, `Draft from ${LANG_NAME[other]}`, `${LANG_NAME[other]} से ड्राफ़्ट बनाएँ`)}
                  </Button>
                )}
              </div>
            )}
            {fields.unproofed.includes(lang) && (
              <div className="mb-4 flex flex-wrap items-center gap-2 rounded-xl bg-warn-soft px-4 py-2.5 text-[13.5px] text-warn">
                <span className="flex-1">{t(lang, "Machine draft. Read it through and correct it.", "मशीन ड्राफ़्ट। पढ़कर ठीक कर लें।")}</span>
                {editable && (
                  <Button size="sm" onClick={() => set({ unproofed: fields.unproofed.filter((l) => l !== lang) }, 200)}>
                    <Check className="size-4" aria-hidden="true" /> {t(lang, "I've checked it", "मैंने जाँच ली")}
                  </Button>
                )}
              </div>
            )}

            <div className="space-y-4">
              <HeroPicker hero={fields.hero} editable={editable} lang={lang} onChange={(hero) => set({ hero }, 300)} toast={toast} />

              <HeadlineField
                lang={lang}
                editable={editable}
                value={fields[`headline_${lang}`]}
                onChange={(v) => set({ [`headline_${lang}`]: v } as Partial<Fields>)}
                aiText={ai.enabled && editable ? docText(save.draft.current[`body_${lang}`]) : ""}
                toast={toast}
              />
              {(editable || fields[`standfirst_${lang}`]) && <AutoTextarea
                value={fields[`standfirst_${lang}`]}
                onChange={(v) => set({ [`standfirst_${lang}`]: v } as Partial<Fields>)}
                readOnly={!editable}
                lang={lang}
                placeholder={t(lang, "Subheading: one line on what happened and why it matters", "उपशीर्षक: एक पंक्ति में क्या हुआ और क्यों अहम है")}
                className="standfirst-input"
                maxLength={600}
                label={t(lang, "Subheading", "उपशीर्षक")}
                extra={
                  ai.enabled && editable && !fields[`standfirst_${lang}`].trim() && wordCount(docText(save.draft.current[`body_${lang}`])) > 40 ? (
                    <AiSummary lang={lang} text={docText(save.draft.current[`body_${lang}`])} onPick={(v) => set({ [`standfirst_${lang}`]: v } as Partial<Fields>, 200)} toast={toast} />
                  ) : null
                }
              />}

              <Suspense fallback={<div className="h-48 animate-pulse rounded-xl bg-wash" />}>
                <StoryEditor
                  key={`${lang}-${editorKey}`}
                  value={save.draft.current[`body_${lang}`]}
                  lang={lang}
                  editable={editable}
                  placeholder={t(lang, "Write the story, or paste it from Word, Google Docs or a web page…", "ख़बर लिखें, या Word, Google Docs या वेब पेज से चिपकाएँ…")}
                  onChange={(doc) => save.change({ [`body_${lang}`]: doc } as Partial<Fields>)}
                  onReady={onReady}
                  toast={toast}
                />
              </Suspense>
            </div>
          </div>
        </main>

        <aside className="hidden w-[380px] shrink-0 border-l border-line bg-[#fbfbfd] lg:block">
          <div className="sticky top-[56px] max-h-[calc(100dvh-56px)] overflow-y-auto px-4 py-4">{panelBody}</div>
        </aside>
      </div>

      {/* Phones: the panels open from a bar at the bottom. */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex gap-2 border-t border-line bg-white/95 px-3 py-2 pb-[max(8px,env(safe-area-inset-bottom))] backdrop-blur lg:hidden" aria-label="Story panels">
        <PanelButton icon={MessageSquareText} label="Notes" count={article.notes.filter((n) => n.status === "open").length} onClick={() => (setPanel("notes"), setPanelOpen(true))} />
        <PanelButton icon={History} label="History" onClick={() => (setPanel("history"), setPanelOpen(true))} />
        <PanelButton icon={SlidersHorizontal} label="Details" onClick={() => (setPanel("details"), setPanelOpen(true))} />
      </nav>
      {panelOpen && (
        <Drawer title="Story" onClose={() => setPanelOpen(false)}>
          {panelBody}
        </Drawer>
      )}

      {(article.can.note && (senior || own)) && editor && <NoteBar editor={editor} lang={lang} onCreate={addNoteFromSelection} />}
      {noteDraft && editor && (
        <NoteDialog
          kind={noteDraft.kind}
          quote={noteDraft.quote}
          lang={lang}
          onClose={() => setNoteDraft(null)}
          onSave={async (text) => {
            try {
              await createNote(editor, article.id, lang, noteDraft.kind, noteDraft.quote, noteDraft.range, text);
              await save.flush();
              revalidate();
              setPanel("notes");
            } catch (err) {
              toast(errorText(err), "error");
              throw err;
            }
          }}
        />
      )}

      {sheet && (
        <PublishSheet article={article} mode={sheet} checks={checks} home={home} busy={busy} onSend={(c) => void send(c)} onClose={() => setSheet(null)} />
      )}
      {prompt && (
        <DecisionPrompt
          kind={prompt}
          openNotes={article.notes.filter((n) => n.status === "open").length}
          busy={busy}
          onClose={() => setPrompt(null)}
          onConfirm={async (message) => {
            const ok = await run(
              () => (prompt === "return" ? returnArticle(article.id, message) : prompt === "reject" ? rejectArticle(article.id, message) : unpublishArticle(article.id, message)),
              prompt === "return" ? "Sent back to the writer." : prompt === "reject" ? "Story declined." : "Taken off the site.",
            );
            if (ok) {
              setPrompt(null);
              if (prompt !== "unpublish") navigate("/review");
            }
          }}
        />
      )}
      {changesOpen && (
        <ChangesView
          article={article}
          onClose={() => {
            setChangesOpen(false);
            if (own && article.changed_by.length) void markSeen(article.id).then(setArticle).catch(() => {});
          }}
        />
      )}
    </div>
  );
}

// ------------------------------------------------------------ pieces

function SaveBadge({ state, hidden }: { state: SaveState; hidden?: boolean }) {
  if (hidden) return null;
  const map: Record<SaveState, { text: string; cls: string }> = {
    saved: { text: "Saved", cls: "text-faint" },
    pending: { text: "Editing…", cls: "text-faint" },
    saving: { text: "Saving…", cls: "text-faint" },
    offline: { text: "Offline, will save", cls: "text-warn" },
    error: { text: "Not saved", cls: "text-bad" },
  };
  const m = map[state];
  return (
    <span className={clsx("inline-flex items-center gap-1 truncate text-[12px]", m.cls)} aria-live="polite">
      {state === "offline" && <CloudOff className="size-3.5" aria-hidden="true" />}
      {state === "saved" && <Check className="size-3.5" aria-hidden="true" />}
      {m.text}
    </span>
  );
}

function PanelButton({ icon: Icon, label, count, onClick }: { icon: typeof History; label: string; count?: number; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="flex h-11 flex-1 items-center justify-center gap-1.5 rounded-xl border border-line text-[13px] font-medium text-ink">
      <Icon className="size-4 text-muted" aria-hidden="true" />
      {label}
      {count ? <span className="rounded-full bg-warn-soft px-1.5 text-[12px] text-warn">{count}</span> : null}
    </button>
  );
}

function Banners({ article, own, onChanges, onNotes }: { article: Article; own: boolean; onChanges: () => void; onNotes: () => void }) {
  const open = article.notes.filter((n) => n.status === "open").length;
  const out: React.ReactElement[] = [];
  if (own && article.changed_by.length) {
    const names = [...new Map(article.changed_by.map((p) => [p.id, `${p.name} (${ROLE_LABEL[p.role]})`])).values()].join(", ");
    out.push(
      <div key="changed" className="banner banner-changed">
        <Eye className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">Changed by {names} · {timeAgo(article.changed_by[article.changed_by.length - 1].at)}</span>
        <button type="button" onClick={onChanges} className="font-semibold underline-offset-2 hover:underline">View changes</button>
      </div>,
    );
  }
  if (own && article.status === "changes_requested") {
    out.push(
      <div key="returned" className="banner banner-warn">
        <Undo2 className="size-4 shrink-0" aria-hidden="true" />
        <span className="flex-1">
          <b>{article.reviewer?.name ?? "Your editor"}</b> sent this back{article.review_message ? `: “${article.review_message}”` : "."}
          {open ? ` ${open} note${open > 1 ? "s" : ""} to look at.` : ""}
        </span>
        {open > 0 && <button type="button" onClick={onNotes} className="font-semibold hover:underline">See notes</button>}
      </div>,
    );
  }
  if (own && article.status === "submitted")
    out.push(<div key="waiting" className="banner banner-info">Waiting for review. You can edit again if your editor sends it back.</div>);
  if (article.status === "rejected")
    out.push(<div key="rejected" className="banner banner-bad">Declined by {article.reviewer?.name ?? "an editor"}{article.review_message ? `: “${article.review_message}”` : "."} Reopen it to rework the story.</div>);
  if (article.status === "unpublished") out.push(<div key="down" className="banner banner-bad">Taken off the site. Reopen it to fix and send it again.</div>);
  if (article.status === "published" && article.needs_check && !own)
    out.push(<div key="check" className="banner banner-info">Published directly by a trusted reporter. Read it and press “Looks good”, or fix it.</div>);
  if (article.status === "published")
    out.push(<div key="live" className="banner banner-good">Live for {targetLabel(article)} · published {timeAgo(article.published_at)}. Changes you make go live when saved.</div>);
  if (article.status === "submitted" && !own && article.can.review)
    out.push(<div key="review" className="banner banner-info">Select words to highlight a problem, suggest wording or comment. You can also edit directly; {article.author.name} will see what you changed.</div>);
  return out.length ? <div className="mb-4 space-y-2">{out}</div> : null;
}

function AutoTextarea({ value, onChange, readOnly, lang, placeholder, className, maxLength, label, extra }: {
  value: string; onChange: (v: string) => void; readOnly: boolean; lang: Lang; placeholder: string; className: string; maxLength: number; label: string; extra?: React.ReactNode;
}) {
  const ref = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${el.scrollHeight}px`;
  }, [value, lang]);
  return (
    <div>
      <textarea
        ref={ref}
        rows={1}
        value={value}
        readOnly={readOnly}
        aria-label={label}
        lang={lang}
        onChange={(e) => onChange(e.target.value.replace(/\n+/g, " "))}
        onKeyDown={(e) => e.key === "Enter" && e.preventDefault()}
        placeholder={placeholder}
        maxLength={maxLength}
        className={clsx("block w-full resize-none overflow-hidden border-0 bg-transparent p-0 focus:outline-none focus:ring-0", className, lang === "hi" && "lang-hi")}
      />
      {extra}
    </div>
  );
}

function HeadlineField({ lang, editable, value, onChange, aiText, toast }: { lang: Lang; editable: boolean; value: string; onChange: (v: string) => void; aiText: string; toast: (t: string, tone?: "error") => void }) {
  const [ideas, setIdeas] = useState<string[] | null>(null);
  const [busy, setBusy] = useState(false);
  const suggest = async () => {
    setBusy(true);
    try {
      const r = await runAi("headline", `${value}\n\n${aiText}`.trim(), lang);
      setIdeas(r.suggestions.length ? r.suggestions : [r.output]);
    } catch (err) {
      toast(errorText(err), "error");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div>
      <AutoTextarea
        value={value}
        onChange={onChange}
        readOnly={!editable}
        lang={lang}
        placeholder={t(lang, "Headline", "शीर्षक")}
        className="headline-input"
        maxLength={300}
        label={t(lang, "Headline", "शीर्षक")}
      />
      {aiText.split(/\s+/).length > 30 && (
        <button type="button" onClick={() => void suggest()} disabled={busy} className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline disabled:opacity-60">
          {busy ? <Spinner className="size-3" /> : <Sparkles className="size-3.5" aria-hidden="true" />} {t(lang, "Suggest headlines", "शीर्षक सुझाएँ")}
        </button>
      )}
      {ideas && (
        <ul className="mt-2 space-y-1 rounded-xl border border-line bg-wash p-2">
          {ideas.map((idea) => (
            <li key={idea}>
              <button type="button" onClick={() => (onChange(idea), setIdeas(null))} className={clsx("w-full rounded-lg px-2.5 py-1.5 text-left text-[14px] hover:bg-white", lang === "hi" && "lang-hi")}>{idea}</button>
            </li>
          ))}
          <li><button type="button" onClick={() => setIdeas(null)} className="px-2.5 text-[12px] text-muted hover:underline"><X className="mr-1 inline size-3" />Close</button></li>
        </ul>
      )}
    </div>
  );
}

function AiSummary({ lang, text, onPick, toast }: { lang: Lang; text: string; onPick: (v: string) => void; toast: (t: string, tone?: "error") => void }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      type="button"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          onPick((await runAi("summary", text, lang)).output.trim());
        } catch (err) {
          toast(errorText(err), "error");
        } finally {
          setBusy(false);
        }
      }}
      className="mt-1 inline-flex items-center gap-1 text-[12.5px] font-medium text-brand hover:underline disabled:opacity-60"
    >
      {busy ? <Spinner className="size-3" /> : <Sparkles className="size-3.5" aria-hidden="true" />} {t(lang, "Write the subheading for me", "उपशीर्षक लिख दें")}
    </button>
  );
}

function Details({ fields, article, editable, onChange }: { fields: Fields; article: Article; editable: boolean; onChange: (p: Partial<Fields>) => void }) {
  const [tag, setTag] = useState("");
  const addTag = () => {
    const v = tag.trim().toLowerCase();
    if (v && !fields.tags.includes(v) && fields.tags.length < 12) onChange({ tags: [...fields.tags, v] });
    setTag("");
  };
  return (
    <div className="space-y-5 text-[14px]">
      <dl className="grid grid-cols-[110px_1fr] gap-x-3 gap-y-2 text-[13px]">
        <dt className="text-muted">Writer</dt>
        <dd>{article.author.name}</dd>
        <dt className="text-muted">For</dt>
        <dd>{targetLabel(article)} <span className="text-faint">(set when publishing)</span></dd>
        <dt className="text-muted">Started</dt>
        <dd>{timeAgo(article.created_at)}</dd>
        {article.submitted_at && (
          <>
            <dt className="text-muted">Sent</dt>
            <dd>{timeAgo(article.submitted_at)}</dd>
          </>
        )}
      </dl>
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium">Desk</span>
        <select className={selectCls} disabled={!editable} value={fields.section} onChange={(e) => onChange({ section: e.target.value as SectionKey })}>
          {SECTION_KEYS.map((k) => (
            <option key={k} value={k}>{SECTION_LABEL[k]}</option>
          ))}
        </select>
      </label>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium">Main language</span>
        <Segmented
          label="Main language"
          value={fields.primary_language}
          onChange={(v) => editable && onChange({ primary_language: v })}
          items={[{ id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }]}
        />
        <p className="mt-1 text-[12px] text-muted">The other language is optional.</p>
      </div>
      <div>
        <span className="mb-1.5 block text-[13px] font-medium">Topics</span>
        <div className="flex flex-wrap gap-1.5">
          {fields.tags.map((x) => (
            <span key={x} className="inline-flex h-7 items-center gap-1 rounded-full bg-select px-2.5 text-[12.5px]">
              {x}
              {editable && (
                <button type="button" aria-label={`Remove ${x}`} onClick={() => onChange({ tags: fields.tags.filter((y) => y !== x) })}>
                  <X className="size-3" />
                </button>
              )}
            </span>
          ))}
        </div>
        {editable && (
          <input
            className={clsx(textareaCls, "mt-2 h-9 py-0")}
            value={tag}
            onChange={(e) => setTag(e.target.value)}
            onKeyDown={(e) => {
              if ((e.key === "Enter" || e.key === ",") && !e.nativeEvent.isComposing) {
                e.preventDefault();
                addTag();
              }
            }}
            onBlur={addTag}
            placeholder="Add a topic and press Enter"
            maxLength={40}
          />
        )}
      </div>
    </div>
  );
}

function DecisionPrompt({ kind, openNotes, busy, onClose, onConfirm }: { kind: "return" | "reject" | "unpublish"; openNotes: number; busy: boolean; onClose: () => void; onConfirm: (message: string) => void }) {
  const [text, setText] = useState("");
  const meta = {
    return: { title: "Send back to the writer", label: "What should they change?", hint: openNotes ? `Your ${openNotes} highlight${openNotes > 1 ? "s" : ""} go with it. A note is optional.` : "Write what to fix, or highlight words in the story first.", min: openNotes ? 0 : 3, action: "Send back" },
    reject: { title: "Decline the story", label: "Why is it declined?", hint: "The writer sees this. They can rework it and send it again.", min: 5, action: "Decline" },
    unpublish: { title: "Take off the site", label: "Why?", hint: "Readers will no longer find it. You can reopen and republish later.", min: 3, action: "Take it down" },
  }[kind];
  const valid = text.trim().length >= meta.min;
  return (
    <Modal
      title={meta.title}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant={kind === "return" ? "primary" : "danger"} disabled={!valid || busy} onClick={() => onConfirm(text.trim())}>
            {busy && <Spinner />}
            {meta.action}
          </Button>
        </>
      }
    >
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium">{meta.label}</span>
        <textarea className={textareaCls} rows={4} value={text} onChange={(e) => setText(e.target.value)} autoFocus />
      </label>
      <p className="text-[12.5px] text-muted">{meta.hint}</p>
    </Modal>
  );
}
