/**
 * The story body editor: a plain, familiar word-processor toolbar over TipTap.
 *
 * "Basic" shows what a news story needs (text styles with their sizes, bold, italic, underline, lists,
 * quote, link, photo, undo). "More" adds formatting for longer pieces (strike, highlight, colour,
 * alignment, sub/superscript, divider, table, fact box, pull quote, find and replace, digits). The choice is
 * remembered per device. Pasting from Word, Google Docs or a web page keeps structure and drops clutter.
 */
import { useEffect, useRef, useState, type ReactNode } from "react";
import { EditorContent, useEditor, useEditorState, type Editor } from "@tiptap/react";
import {
  AlignCenter, AlignJustify, AlignLeft, AlignRight, Bold, ChevronDown, Eraser, Highlighter, ImagePlus, Italic, Link2, List,
  ListOrdered, Mic, Minus, MessageSquareQuote, Quote, Redo2, Replace, SlidersHorizontal, Square, Strikethrough, Subscript as SubIcon,
  Superscript as SupIcon, Table2, Type, Underline, Undo2, Video, Camera, Images, StickyNote,
} from "lucide-react";
import clsx from "clsx";
import type { Doc, Lang } from "@/domain/types";
import { Button, Field, Modal, inputCls } from "@/components/ui/primitives";
import { HIGHLIGHTS, TEXT_COLORS, storyExtensions } from "./extensions";
import { Menu, MenuItem } from "./Menu";
import { cleanPastedHtml } from "./paste";
import { pickFiles, uploadFile, useRecorder, type PickKind } from "./media";
import { convertDigits, countMatches, docText, readingMinutes, replaceAll, wordCount } from "./tools";

const MODE_KEY = "newsroom.toolbar";

/** Text styles shown in the Basic toolbar, with the size readers will see (desktop). */
export const TEXT_STYLES = [
  { id: "p", en: "Text", hi: "सामान्य", size: "19px" },
  { id: "h2", en: "Heading", hi: "शीर्षक", size: "26px" },
  { id: "h3", en: "Subheading", hi: "उपशीर्षक", size: "21px" },
] as const;

interface Props {
  value: Doc;
  lang: Lang;
  editable: boolean;
  placeholder: string;
  onChange: (doc: Doc) => void;
  onReady?: (editor: Editor | null) => void;
  toast: (text: string, tone?: "info" | "error" | "success") => void;
}

const t = (lang: Lang, en: string, hi: string) => (lang === "hi" ? hi : en);

export default function StoryEditor({ value, lang, editable, placeholder, onChange, onReady, toast }: Props) {
  const [full, setFull] = useState(() => {
    try {
      return localStorage.getItem(MODE_KEY) === "full";
    } catch {
      return false;
    }
  });
  const [uploading, setUploading] = useState<{ label: string; progress: number } | null>(null);
  const [linkOpen, setLinkOpen] = useState(false);
  const [findOpen, setFindOpen] = useState(false);
  const onChangeRef = useRef(onChange);
  onChangeRef.current = onChange;
  const editorRef = useRef<Editor | null>(null);

  const insertFiles = async (files: File[], at?: number) => {
    const editor = editorRef.current;
    if (!editor) return;
    for (const file of files) {
      const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("image/") ? "image" : null;
      if (!kind) {
        toast(t(lang, "Only photos, videos and audio can be added.", "सिर्फ़ फ़ोटो, वीडियो और ऑडियो जोड़े जा सकते हैं।"), "error");
        continue;
      }
      const label = kind === "image" ? t(lang, "Uploading photo", "फ़ोटो अपलोड हो रही है") : kind === "video" ? t(lang, "Uploading video", "वीडियो अपलोड हो रहा है") : t(lang, "Uploading audio", "ऑडियो अपलोड हो रहा है");
      setUploading({ label, progress: 0 });
      try {
        const up = await uploadFile(file, (p) => setUploading({ label, progress: p }));
        const chain = editor.chain().focus();
        if (at !== undefined) chain.setTextSelection(at);
        chain.insertMedia(up.kind, { src: up.url }).run();
      } catch (err) {
        toast((err as Error).message, "error");
      } finally {
        setUploading(null);
      }
    }
  };

  const editor = useEditor(
    {
      extensions: storyExtensions({ placeholder }),
      content: value && Object.keys(value).length ? value : undefined,
      editable,
      immediatelyRender: true,
      shouldRerenderOnTransaction: false,
      editorProps: {
        attributes: { class: clsx("story-body", lang === "hi" && "lang-hi"), lang, spellcheck: "true", "aria-label": t(lang, "Story text", "ख़बर का पाठ") },
        transformPastedHTML: (html) =>
          cleanPastedHtml(html, (n) =>
            toast(
              t(lang, `${n} photo${n > 1 ? "s" : ""} in the pasted text were left out. Add your own with the Photo button.`, `चिपकाए गए पाठ की ${n} फ़ोटो हटा दी गई। अपनी फ़ोटो फ़ोटो बटन से जोड़ें।`),
            ),
          ),
        handlePaste: (_view, event) => {
          const files = Array.from(event.clipboardData?.files ?? []).filter((f) => /^(image|video|audio)\//.test(f.type));
          if (!files.length) return false;
          void insertFiles(files);
          return true;
        },
        handleDrop: (view, event) => {
          const files = Array.from(event.dataTransfer?.files ?? []).filter((f) => /^(image|video|audio)\//.test(f.type));
          if (!files.length) return false;
          event.preventDefault();
          const pos = view.posAtCoords({ left: event.clientX, top: event.clientY })?.pos;
          void insertFiles(files, pos);
          return true;
        },
      },
      onUpdate: ({ editor }) => onChangeRef.current(editor.getJSON()),
    },
    [lang],
  );
  editorRef.current = editor;

  useEffect(() => {
    onReady?.(editor);
    return () => onReady?.(null);
  }, [editor, onReady]);

  useEffect(() => {
    editor?.setEditable(editable);
  }, [editor, editable]);

  const toggleFull = () => {
    setFull((f) => {
      try {
        localStorage.setItem(MODE_KEY, f ? "basic" : "full");
      } catch {}
      return !f;
    });
  };

  const stats = useEditorState({
    editor,
    selector: ({ editor: e }) => {
      if (!e) return { words: 0 };
      return { words: wordCount(docText(e.getJSON())) };
    },
  });

  if (!editor) return null;
  return (
    <div className="story-editor">
      {editable && (
        <Toolbar
          editor={editor}
          lang={lang}
          full={full}
          onToggleFull={toggleFull}
          onLink={() => setLinkOpen(true)}
          onFind={() => setFindOpen(true)}
          onPick={async (kind) => insertFiles(await pickFiles(kind, kind !== "camera"))}
          onRecorded={(f) => insertFiles([f])}
          toast={toast}
        />
      )}
      {uploading && (
        <div role="status" className="sticky top-[52px] z-10 mx-auto mt-2 flex max-w-[680px] items-center gap-3 rounded-lg bg-brand-soft px-3 py-2 text-[13px] text-brand-deep">
          <span className="flex-1">{uploading.label}…</span>
          <span className="h-1.5 w-28 overflow-hidden rounded-full bg-white">
            <span className="block h-full bg-brand transition-[width]" style={{ width: `${Math.round(uploading.progress * 100)}%` }} />
          </span>
        </div>
      )}
      <EditorContent editor={editor} />
      <p className="mx-auto mt-2 max-w-[680px] px-1 text-[12px] text-faint" aria-live="polite">
        {t(lang, `${stats.words} words · ${readingMinutes(stats.words, lang)} min read`, `${stats.words} शब्द · ${readingMinutes(stats.words, lang)} मिनट`)}
      </p>
      {linkOpen && <LinkDialog editor={editor} lang={lang} onClose={() => setLinkOpen(false)} />}
      {findOpen && <FindDialog editor={editor} lang={lang} onClose={() => setFindOpen(false)} toast={toast} />}
    </div>
  );
}

// ------------------------------------------------------------ toolbar

function TbBtn({ on, label, active, disabled, children }: { on: () => void; label: string; active?: boolean; disabled?: boolean; children: ReactNode }) {
  return (
    <button type="button" className={clsx("tb-btn", active && "is-active")} aria-label={label} title={label} aria-pressed={active} disabled={disabled} onMouseDown={(e) => e.preventDefault()} onClick={on}>
      {children}
    </button>
  );
}

function Toolbar({
  editor, lang, full, onToggleFull, onLink, onFind, onPick, onRecorded, toast,
}: {
  editor: Editor;
  lang: Lang;
  full: boolean;
  onToggleFull: () => void;
  onLink: () => void;
  onFind: () => void;
  onPick: (kind: PickKind) => void;
  onRecorded: (f: File) => void;
  toast: Props["toast"];
}) {
  const s = useEditorState({
    editor,
    selector: ({ editor: e }) => ({
      style: e.isActive("heading", { level: 2 }) ? "h2" : e.isActive("heading", { level: 3 }) ? "h3" : "p",
      bold: e.isActive("bold"),
      italic: e.isActive("italic"),
      underline: e.isActive("underline"),
      strike: e.isActive("strike"),
      bullet: e.isActive("bulletList"),
      ordered: e.isActive("orderedList"),
      quote: e.isActive("blockquote"),
      pull: e.isActive("pullQuote"),
      link: e.isActive("link"),
      sup: e.isActive("superscript"),
      sub: e.isActive("subscript"),
      align: (["center", "right", "justify"] as const).find((a) => e.isActive({ textAlign: a })) ?? "left",
      table: e.isActive("table"),
      canUndo: e.can().undo(),
      canRedo: e.can().redo(),
    }),
  });
  const recorder = useRecorder();
  const c = () => editor.chain().focus();
  const style = TEXT_STYLES.find((x) => x.id === s.style) ?? TEXT_STYLES[0];

  const record = async () => {
    if (recorder.state === "recording") {
      const file = await recorder.stop();
      if (file) onRecorded(file);
      return;
    }
    await recorder.start();
  };
  useEffect(() => {
    if (recorder.state === "denied") toast(t(lang, "Allow the microphone to record, or upload an audio file.", "रिकॉर्ड करने के लिए माइक की अनुमति दें।"), "error");
  }, [recorder.state, lang, toast]);

  return (
    <div role="toolbar" aria-label={t(lang, "Formatting", "फ़ॉर्मैटिंग")} className="story-toolbar">
      <div className="tb-row">
        <Menu
          label={t(lang, "Text style", "पाठ शैली")}
          button={
            <span className="flex items-center gap-1 px-1 text-[13px] font-medium">
              <Type className="size-4" aria-hidden="true" />
              <span className="hidden min-[400px]:inline">{t(lang, style.en, style.hi)}</span>
              <span className="text-faint">{style.size}</span>
              <ChevronDown className="size-3.5" aria-hidden="true" />
            </span>
          }
        >
          {(close) =>
            TEXT_STYLES.map((x) => (
              <MenuItem
                key={x.id}
                active={x.id === s.style}
                hint={x.size}
                onClick={() => {
                  if (x.id === "p") c().setParagraph().run();
                  else c().setHeading({ level: x.id === "h2" ? 2 : 3 }).run();
                  close();
                }}
              >
                <span className={x.id === "h2" ? "text-[17px] font-semibold" : x.id === "h3" ? "text-[15px] font-semibold" : ""}>{t(lang, x.en, x.hi)}</span>
              </MenuItem>
            ))
          }
        </Menu>
        <span className="tb-sep" />
        <TbBtn on={() => c().toggleBold().run()} label={t(lang, "Bold (Ctrl+B)", "बोल्ड")} active={s.bold}><Bold className="size-4" /></TbBtn>
        <TbBtn on={() => c().toggleItalic().run()} label={t(lang, "Italic (Ctrl+I)", "इटैलिक")} active={s.italic}><Italic className="size-4" /></TbBtn>
        <TbBtn on={() => c().toggleUnderline().run()} label={t(lang, "Underline (Ctrl+U)", "रेखांकित")} active={s.underline}><Underline className="size-4" /></TbBtn>
        <span className="tb-sep" />
        <TbBtn on={() => c().toggleBulletList().run()} label={t(lang, "Bullet list", "बुलेट सूची")} active={s.bullet}><List className="size-4" /></TbBtn>
        <TbBtn on={() => c().toggleOrderedList().run()} label={t(lang, "Numbered list", "क्रमांकित सूची")} active={s.ordered}><ListOrdered className="size-4" /></TbBtn>
        <TbBtn on={() => c().toggleBlockquote().run()} label={t(lang, "Quote", "उद्धरण")} active={s.quote}><Quote className="size-4" /></TbBtn>
        <TbBtn on={onLink} label={t(lang, "Link", "लिंक")} active={s.link}><Link2 className="size-4" /></TbBtn>
        <span className="tb-sep" />
        <Menu label={t(lang, "Add photo, video or voice", "फ़ोटो, वीडियो या आवाज़ जोड़ें")} button={<span className="flex items-center gap-1 px-1 text-[13px] font-medium"><ImagePlus className="size-4" aria-hidden="true" /><span className="hidden sm:inline">{t(lang, "Media", "मीडिया")}</span></span>}>
          {(close) => (
            <>
              <MenuItem onClick={() => (close(), onPick("camera"))}><span className="flex items-center gap-2"><Camera className="size-4" />{t(lang, "Take a photo", "फ़ोटो खींचें")}</span></MenuItem>
              <MenuItem onClick={() => (close(), onPick("photo"))}><span className="flex items-center gap-2"><Images className="size-4" />{t(lang, "Photo from gallery", "गैलरी से फ़ोटो")}</span></MenuItem>
              <MenuItem onClick={() => (close(), onPick("video"))}><span className="flex items-center gap-2"><Video className="size-4" />{t(lang, "Video", "वीडियो")}</span></MenuItem>
              <MenuItem onClick={() => (close(), void record())}><span className="flex items-center gap-2"><Mic className="size-4" />{t(lang, "Record voice", "आवाज़ रिकॉर्ड करें")}</span></MenuItem>
            </>
          )}
        </Menu>
        {recorder.state === "recording" && (
          <button type="button" onClick={() => void record()} className="ml-1 inline-flex h-8 items-center gap-1.5 rounded-full bg-bad px-3 text-[12px] font-semibold text-white">
            <Square className="size-3 fill-current" aria-hidden="true" /> {t(lang, "Stop", "रोकें")} {Math.floor(recorder.seconds / 60)}:{String(recorder.seconds % 60).padStart(2, "0")}
          </button>
        )}
        <span className="tb-sep max-sm:hidden" />
        <TbBtn on={() => c().undo().run()} label={t(lang, "Undo (Ctrl+Z)", "पूर्ववत")} disabled={!s.canUndo}><Undo2 className="size-4" /></TbBtn>
        <TbBtn on={() => c().redo().run()} label={t(lang, "Redo", "फिर से करें")} disabled={!s.canRedo}><Redo2 className="size-4" /></TbBtn>
        <button type="button" onClick={onToggleFull} aria-pressed={full} className={clsx("tb-more", full && "is-active")}>
          <SlidersHorizontal className="size-4" aria-hidden="true" />
          {full ? t(lang, "Basic", "सरल") : t(lang, "More", "और")}
        </button>
      </div>

      {full && (
        <div className="tb-row border-t border-line">
          <TbBtn on={() => c().toggleStrike().run()} label={t(lang, "Strikethrough", "काटें")} active={s.strike}><Strikethrough className="size-4" /></TbBtn>
          <Menu label={t(lang, "Highlight", "हाइलाइट")} button={<Highlighter className="size-4" />}>
            {(close) => (
              <>
                {HIGHLIGHTS.map((h) => (
                  <MenuItem key={h.id} onClick={() => (c().setHighlight({ color: h.id }).run(), close())}>
                    <span className="flex items-center gap-2"><span className="size-4 rounded" style={{ background: h.css }} />{h.label}</span>
                  </MenuItem>
                ))}
                <MenuItem onClick={() => (c().unsetHighlight().run(), close())}>{t(lang, "No highlight", "हाइलाइट हटाएँ")}</MenuItem>
              </>
            )}
          </Menu>
          <Menu label={t(lang, "Text colour", "रंग")} button={<span className="text-[15px] font-semibold underline decoration-[#b42318] decoration-2 underline-offset-2">A</span>}>
            {(close) => (
              <>
                {TEXT_COLORS.map((col) => (
                  <MenuItem key={col.id} onClick={() => (c().setTextColor(col.id).run(), close())}>
                    <span className="flex items-center gap-2"><span className="size-4 rounded-full" style={{ background: col.css }} />{t(lang, col.label, col.hi)}</span>
                  </MenuItem>
                ))}
                <MenuItem onClick={() => (c().unsetTextColor().run(), close())}>{t(lang, "Normal colour", "सामान्य रंग")}</MenuItem>
              </>
            )}
          </Menu>
          <span className="tb-sep" />
          <TbBtn on={() => c().setTextAlign("left").run()} label={t(lang, "Align left", "बाएँ")} active={s.align === "left"}><AlignLeft className="size-4" /></TbBtn>
          <TbBtn on={() => c().setTextAlign("center").run()} label={t(lang, "Centre", "बीच में")} active={s.align === "center"}><AlignCenter className="size-4" /></TbBtn>
          <TbBtn on={() => c().setTextAlign("right").run()} label={t(lang, "Align right", "दाएँ")} active={s.align === "right"}><AlignRight className="size-4" /></TbBtn>
          <TbBtn on={() => c().setTextAlign("justify").run()} label={t(lang, "Justify", "दोनों ओर")} active={s.align === "justify"}><AlignJustify className="size-4" /></TbBtn>
          <span className="tb-sep" />
          <TbBtn on={() => c().toggleSuperscript().run()} label={t(lang, "Superscript", "ऊपर")} active={s.sup}><SupIcon className="size-4" /></TbBtn>
          <TbBtn on={() => c().toggleSubscript().run()} label={t(lang, "Subscript", "नीचे")} active={s.sub}><SubIcon className="size-4" /></TbBtn>
          <span className="tb-sep" />
          <TbBtn on={() => c().setHorizontalRule().run()} label={t(lang, "Divider line", "विभाजक रेखा")}><Minus className="size-4" /></TbBtn>
          <Menu label={t(lang, "Table", "तालिका")} button={<Table2 className="size-4" />}>
            {(close) =>
              s.table ? (
                <>
                  <MenuItem onClick={() => (c().addRowAfter().run(), close())}>{t(lang, "Add row", "पंक्ति जोड़ें")}</MenuItem>
                  <MenuItem onClick={() => (c().addColumnAfter().run(), close())}>{t(lang, "Add column", "कॉलम जोड़ें")}</MenuItem>
                  <MenuItem onClick={() => (c().deleteRow().run(), close())}>{t(lang, "Delete row", "पंक्ति हटाएँ")}</MenuItem>
                  <MenuItem onClick={() => (c().deleteColumn().run(), close())}>{t(lang, "Delete column", "कॉलम हटाएँ")}</MenuItem>
                  <MenuItem onClick={() => (c().deleteTable().run(), close())}>{t(lang, "Delete table", "तालिका हटाएँ")}</MenuItem>
                </>
              ) : (
                <>
                  <MenuItem onClick={() => (c().insertTable({ rows: 3, cols: 2, withHeaderRow: true }).run(), close())}>{t(lang, "Table, 2 columns", "तालिका, 2 कॉलम")}</MenuItem>
                  <MenuItem onClick={() => (c().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run(), close())}>{t(lang, "Table, 3 columns", "तालिका, 3 कॉलम")}</MenuItem>
                </>
              )
            }
          </Menu>
          <TbBtn on={() => c().insertFactBox().run()} label={t(lang, "Key facts box", "मुख्य तथ्य बॉक्स")}><StickyNote className="size-4" /></TbBtn>
          <TbBtn on={() => c().togglePullQuote().run()} label={t(lang, "Pull quote", "बड़ा उद्धरण")} active={s.pull}><MessageSquareQuote className="size-4" /></TbBtn>
          <span className="tb-sep" />
          <TbBtn on={onFind} label={t(lang, "Find and replace", "खोजें और बदलें")}><Replace className="size-4" /></TbBtn>
          <TbBtn
            on={() => {
              const n = convertDigits(editor, lang === "hi" ? "hi" : "en");
              toast(n ? t(lang, `Changed ${n} digits`, `${n} अंक बदले`) : t(lang, "No digits to change", "बदलने को कोई अंक नहीं"));
            }}
            label={lang === "hi" ? "अंक 0-9 को ०-९ में बदलें" : "Change ०-९ digits to 0-9"}
          >
            <span className="text-[12px] font-semibold">{lang === "hi" ? "१२३" : "123"}</span>
          </TbBtn>
          <TbBtn on={() => c().unsetAllMarks().clearNodes().run()} label={t(lang, "Clear formatting", "फ़ॉर्मैटिंग हटाएँ")}><Eraser className="size-4" /></TbBtn>
        </div>
      )}
    </div>
  );
}

// ------------------------------------------------------------ dialogs

function LinkDialog({ editor, lang, onClose }: { editor: Editor; lang: Lang; onClose: () => void }) {
  const [url, setUrl] = useState(() => (editor.getAttributes("link").href as string) ?? "");
  const save = () => {
    const href = url.trim();
    const chain = editor.chain().focus().extendMarkRange("link");
    if (!href) chain.unsetLink().run();
    else {
      const full = /^(https?:\/\/|mailto:)/i.test(href) ? href : `https://${href}`;
      if (editor.state.selection.empty && !editor.isActive("link")) chain.insertContent({ type: "text", text: full, marks: [{ type: "link", attrs: { href: full } }] }).run();
      else chain.setLink({ href: full }).run();
    }
    onClose();
  };
  return (
    <Modal
      title={t(lang, "Link", "लिंक")}
      onClose={onClose}
      footer={
        <>
          {editor.isActive("link") && <Button variant="danger" onClick={() => (editor.chain().focus().extendMarkRange("link").unsetLink().run(), onClose())}>{t(lang, "Remove link", "लिंक हटाएँ")}</Button>}
          <Button onClick={onClose}>{t(lang, "Cancel", "रद्द करें")}</Button>
          <Button variant="primary" onClick={save}>{t(lang, "Save", "सहेजें")}</Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), save())}>
        <Field label={t(lang, "Web address", "वेब पता")}>
          <input className={inputCls} value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://" inputMode="url" autoComplete="url" />
        </Field>
      </form>
    </Modal>
  );
}

function FindDialog({ editor, lang, onClose, toast }: { editor: Editor; lang: Lang; onClose: () => void; toast: Props["toast"] }) {
  const [find, setFind] = useState("");
  const [replace, setReplace] = useState("");
  const [matchCase, setMatchCase] = useState(false);
  const count = countMatches(editor, find, matchCase);
  return (
    <Modal
      title={t(lang, "Find and replace", "खोजें और बदलें")}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>{t(lang, "Close", "बंद करें")}</Button>
          <Button
            variant="primary"
            disabled={!count}
            onClick={() => {
              const n = replaceAll(editor, find, replace, matchCase);
              toast(t(lang, `Replaced ${n}`, `${n} बदले गए`), "success");
              onClose();
            }}
          >
            {t(lang, `Replace all (${count})`, `सब बदलें (${count})`)}
          </Button>
        </>
      }
    >
      <Field label={t(lang, "Find", "खोजें")}>
        <input className={inputCls} value={find} onChange={(e) => setFind(e.target.value)} />
      </Field>
      <Field label={t(lang, "Replace with", "इससे बदलें")}>
        <input className={inputCls} value={replace} onChange={(e) => setReplace(e.target.value)} />
      </Field>
      <label className="flex items-center gap-2 text-[13px]">
        <input type="checkbox" checked={matchCase} onChange={(e) => setMatchCase(e.target.checked)} /> {t(lang, "Match capital letters", "बड़े-छोटे अक्षर मिलाएँ")}
      </label>
    </Modal>
  );
}
