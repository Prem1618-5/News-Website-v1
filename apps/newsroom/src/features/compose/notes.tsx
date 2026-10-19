/**
 * Review highlights. A senior selects words and marks a problem (soft red wavy underline), suggests new
 * wording (soft amber) or leaves a comment (soft blue). The writer sees them in the text and in this list,
 * applies a suggestion with one tap, fixes problems and marks them done.
 */
import { useEffect, useState } from "react";
import type { Editor } from "@tiptap/react";
import { Check, CornerDownRight, LocateFixed, MessageSquare, PencilLine, RotateCcw, TriangleAlert, X } from "lucide-react";
import clsx from "clsx";
import { addNote, updateNote } from "@/api/desk";
import { errorText } from "@/api/http";
import type { Article, Lang, Note, NoteKind, Staff } from "@/domain/types";
import { isSenior } from "@/domain/types";
import { Button, Modal, Tabs, textareaCls, timeAgo } from "@/components/ui/primitives";
import { acceptSuggestion, newId, removeNoteMark, scrollToNote } from "@/features/editor/tools";

export const NOTE_META: Record<NoteKind, { label: string; hi: string; icon: typeof TriangleAlert; cls: string }> = {
  problem: { label: "Problem", hi: "समस्या", icon: TriangleAlert, cls: "note-chip-problem" },
  suggestion: { label: "Suggested edit", hi: "सुझाया बदलाव", icon: PencilLine, cls: "note-chip-suggestion" },
  comment: { label: "Comment", hi: "टिप्पणी", icon: MessageSquare, cls: "note-chip-comment" },
};

// ------------------------------------------------------------ selection bar

/** Appears over selected words for whoever may leave notes. On phones it sits at the bottom of the screen. */
export function NoteBar({ editor, lang, onCreate }: { editor: Editor | null; lang: Lang; onCreate: (kind: NoteKind, quote: string, range: { from: number; to: number }) => void }) {
  const [sel, setSel] = useState<{ from: number; to: number; top: number; left: number } | null>(null);
  useEffect(() => {
    if (!editor) return;
    const update = () => {
      const { from, to, empty } = editor.state.selection;
      if (empty || !editor.isFocused || editor.state.doc.textBetween(from, to, " ").trim().length < 2) return setSel(null);
      const a = editor.view.coordsAtPos(from);
      const b = editor.view.coordsAtPos(to);
      setSel({ from, to, top: Math.min(a.top, b.top), left: (a.left + b.right) / 2 });
    };
    const hide = () => window.setTimeout(() => !editor.isFocused && setSel(null), 150);
    editor.on("selectionUpdate", update);
    editor.on("blur", hide);
    return () => {
      editor.off("selectionUpdate", update);
      editor.off("blur", hide);
    };
  }, [editor]);
  if (!editor || !sel) return null;
  const quote = editor.state.doc.textBetween(sel.from, sel.to, " ").slice(0, 600);
  const pick = (kind: NoteKind) => {
    onCreate(kind, quote, { from: sel.from, to: sel.to });
    setSel(null);
  };
  return (
    <div
      role="toolbar"
      aria-label="Mark the selected words"
      className="note-bar"
      style={{ "--nb-top": `${Math.max(64, sel.top - 52)}px`, "--nb-left": `${sel.left}px` } as React.CSSProperties}
      onMouseDown={(e) => e.preventDefault()}
    >
      {(Object.keys(NOTE_META) as NoteKind[]).map((k) => {
        const M = NOTE_META[k];
        return (
          <button key={k} type="button" onClick={() => pick(k)} className={clsx("note-bar-btn", M.cls)}>
            <M.icon className="size-4" aria-hidden="true" />
            {lang === "hi" ? M.hi : M.label}
          </button>
        );
      })}
    </div>
  );
}

export function NoteDialog({ kind, quote, lang, onSave, onClose }: { kind: NoteKind; quote: string; lang: Lang; onSave: (text: { message: string; suggestion: string }) => Promise<void>; onClose: () => void }) {
  const [message, setMessage] = useState("");
  const [suggestion, setSuggestion] = useState(kind === "suggestion" ? quote : "");
  const [busy, setBusy] = useState(false);
  const M = NOTE_META[kind];
  const valid = kind === "suggestion" ? suggestion.trim() && suggestion.trim() !== quote.trim() : kind === "comment" ? message.trim() : true;
  const save = async () => {
    if (!valid || busy) return;
    setBusy(true);
    try {
      await onSave({ message: message.trim(), suggestion: suggestion.trim() });
      onClose();
    } finally {
      setBusy(false);
    }
  };
  return (
    <Modal
      title={M.label}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid || busy} onClick={() => void save()}>Add</Button>
        </>
      }
    >
      <blockquote className={clsx("rounded-lg px-3 py-2 text-[14px]", `note note-${kind}`, lang === "hi" && "lang-hi")}>{quote}</blockquote>
      {kind === "suggestion" && (
        <label className="block">
          <span className="mb-1.5 block text-[13px] font-medium">Change it to</span>
          <textarea className={clsx(textareaCls, lang === "hi" && "lang-hi")} rows={3} value={suggestion} onChange={(e) => setSuggestion(e.target.value)} autoFocus />
        </label>
      )}
      <label className="block">
        <span className="mb-1.5 block text-[13px] font-medium">
          {kind === "problem" ? "What is wrong?" : kind === "suggestion" ? "Why (optional)" : "Comment"}
          {kind === "problem" && <span className="font-normal text-faint"> (optional)</span>}
        </span>
        <textarea
          className={textareaCls}
          rows={3}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder={kind === "problem" ? "Spelling of the officer's name; check with the police station." : ""}
          autoFocus={kind !== "suggestion"}
          onKeyDown={(e) => e.key === "Enter" && (e.metaKey || e.ctrlKey) && void save()}
        />
      </label>
    </Modal>
  );
}

/** Create a note: mark the words in the document, then store the note. Undoes the mark if storing fails. */
export async function createNote(
  editor: Editor,
  articleId: string,
  lang: Lang,
  kind: NoteKind,
  quote: string,
  range: { from: number; to: number },
  text: { message: string; suggestion: string },
): Promise<Note> {
  const id = newId("note");
  editor.chain().setTextSelection(range).setNote(id, kind).run();
  try {
    return await addNote(articleId, { id, kind, lang, quote, ...text });
  } catch (err) {
    removeNoteMark(editor, id);
    throw err;
  }
}

// ------------------------------------------------------------ list

export function NotesPanel({
  article, me, editor, editorLang, onChanged, toast,
}: {
  article: Article;
  me: Staff;
  editor: Editor | null;
  editorLang: Lang;
  onChanged: () => void;
  toast: (t: string, tone?: "info" | "error" | "success") => void;
}) {
  const [show, setShow] = useState<"open" | "all">("open");
  const notes = article.notes.filter((n) => (show === "open" ? n.status === "open" : true));
  const own = article.author.id === me.id;
  const senior = isSenior(me);
  const counts = { open: article.notes.filter((n) => n.status === "open").length, all: article.notes.length };

  const act = async (note: Note, body: { status?: Note["status"]; reply?: string }) => {
    try {
      await updateNote(article.id, note.id, body);
      if (body.status && body.status !== "open" && editor && note.lang === editorLang) removeNoteMark(editor, note.id);
      onChanged();
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  const accept = async (note: Note) => {
    if (!editor || note.lang !== editorLang) return toast("Switch to the story's language tab to apply this change.");
    if (!acceptSuggestion(editor, note.id, note.suggestion)) return toast("The marked words were changed already. Edit the text by hand.", "error");
    await act(note, { status: "accepted" });
  };

  if (!article.notes.length)
    return (
      <p className="text-[13px] text-muted">
        {senior && !own ? "Select words in the story to mark a problem, suggest an edit or leave a comment." : "No notes from your editor yet."}
      </p>
    );

  return (
    <div className="space-y-3">
      <Tabs label="Which notes" value={show} onChange={setShow} items={[{ id: "open", label: "To do", count: counts.open }, { id: "all", label: "All", count: counts.all }]} />
      {notes.length === 0 && <p className="text-[13px] text-muted">Everything is settled.</p>}
      <ul className="space-y-2.5">
        {notes.map((n) => (
          <NoteCard
            key={n.id}
            note={n}
            canAccept={own && article.can.edit && n.kind === "suggestion"}
            canDone={(own || senior) && n.kind !== "suggestion"}
            canDismiss={senior || n.author.id === me.id}
            onJump={() => editor && scrollToNote(editor, n.id)}
            onAccept={() => void accept(n)}
            onDone={() => void act(n, { status: "done" })}
            onDismiss={() => void act(n, { status: "dismissed" })}
            onReopen={() => void act(n, { status: "open" })}
            onReply={(reply) => act(n, { reply })}
          />
        ))}
      </ul>
    </div>
  );
}

function NoteCard({
  note, canAccept, canDone, canDismiss, onJump, onAccept, onDone, onDismiss, onReopen, onReply,
}: {
  note: Note;
  canAccept: boolean;
  canDone: boolean;
  canDismiss: boolean;
  onJump: () => void;
  onAccept: () => void;
  onDone: () => void;
  onDismiss: () => void;
  onReopen: () => void;
  onReply: (text: string) => Promise<void>;
}) {
  const [reply, setReply] = useState("");
  const M = NOTE_META[note.kind];
  const open = note.status === "open";
  const hi = note.lang === "hi";
  return (
    <li className={clsx("rounded-xl border bg-white p-3", open ? "border-line" : "border-line/60 opacity-75")}>
      <div className="flex items-center gap-2 text-[12.5px]">
        <span className={clsx("inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 font-medium", M.cls)}>
          <M.icon className="size-3.5" aria-hidden="true" />
          {M.label}
        </span>
        <span className="text-faint">{note.author.name} · {timeAgo(note.created_at)}</span>
        {!open && <span className="ml-auto text-faint">{note.status === "accepted" ? "Applied" : note.status === "done" ? "Fixed" : "Dismissed"}</span>}
      </div>
      {note.quote && (
        <button type="button" onClick={onJump} className={clsx("mt-2 block w-full rounded-md text-left text-[13.5px]", `note note-${note.kind}`, hi && "lang-hi")} title="Show in the story">
          <LocateFixed className="mr-1 inline size-3.5 align-[-2px] text-faint" aria-hidden="true" />
          {note.quote.length > 160 ? `${note.quote.slice(0, 160)}…` : note.quote}
        </button>
      )}
      {note.kind === "suggestion" && (
        <p className={clsx("mt-1.5 text-[13.5px]", hi && "lang-hi")}>
          <CornerDownRight className="mr-1 inline size-3.5 align-[-2px] text-faint" aria-hidden="true" />
          <ins className="diff-ins">{note.suggestion}</ins>
        </p>
      )}
      {note.message && <p className="mt-1.5 text-[13.5px] text-ink">{note.message}</p>}
      {note.replies.map((r, i) => (
        <p key={i} className="mt-1.5 border-l-2 border-line pl-2 text-[13px]">
          <span className="font-medium">{r.name}</span> <span className="text-muted">{r.text}</span>
        </p>
      ))}
      <div className="mt-2.5 flex flex-wrap items-center gap-1.5">
        {open && canAccept && (
          <Button size="sm" variant="primary" onClick={onAccept}>
            <Check className="size-3.5" aria-hidden="true" /> Apply change
          </Button>
        )}
        {open && canDone && (
          <Button size="sm" onClick={onDone}>
            <Check className="size-3.5" aria-hidden="true" /> Fixed
          </Button>
        )}
        {open && canDismiss && (
          <Button size="sm" variant="ghost" onClick={onDismiss}>
            <X className="size-3.5" aria-hidden="true" /> Dismiss
          </Button>
        )}
        {!open && canDismiss && (
          <Button size="sm" variant="ghost" onClick={onReopen}>
            <RotateCcw className="size-3.5" aria-hidden="true" /> Reopen
          </Button>
        )}
      </div>
      {open && (
        <form
          className="mt-2 flex gap-1.5"
          onSubmit={(e) => {
            e.preventDefault();
            if (!reply.trim()) return;
            void onReply(reply.trim()).then(() => setReply(""));
          }}
        >
          <input value={reply} onChange={(e) => setReply(e.target.value)} placeholder="Reply" aria-label="Reply" className="h-8 min-w-0 flex-1 rounded-lg border border-line px-2.5 text-[13px] focus:border-brand focus:outline-none" />
          <Button size="sm" type="submit" disabled={!reply.trim()}>Send</Button>
        </form>
      )}
    </li>
  );
}
