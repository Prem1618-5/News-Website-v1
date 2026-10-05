import { useMemo } from "react";
import { filterSuggestionItems, insertOrUpdateBlockForSlashMenu } from "@blocknote/core/extensions";
import { en } from "@blocknote/core/locales";
import { getDefaultReactSlashMenuItems, SuggestionMenuController, useCreateBlockNote } from "@blocknote/react";
import { BlockNoteView, lightDefaultTheme, type Theme } from "@blocknote/mantine";
import "@blocknote/mantine/style.css";
import { ImagePlay } from "lucide-react";
import type { ArticleBlock, Language } from "@/domain/types";
import { articleSchema, type ArticleEditorInstance } from "./schema";

export interface TextSelection {
  blockId: string;
  quote: string;
}

const FONT: Record<Language, string> = {
  en: '"Literata", Georgia, serif',
  hi: '"Noto Serif Devanagari", "Noto Sans Devanagari", "Literata", serif',
};

const PLACEHOLDER: Record<Language, { empty: string; line: string }> = {
  en: { empty: "Start writing your story. Type / for headings, quotes, photos and video.", line: "Keep writing, or type / to add something" },
  hi: { empty: "अपनी खबर यहाँ लिखना शुरू करें। शीर्षक, उद्धरण, फ़ोटो या वीडियो के लिए / टाइप करें।", line: "लिखते रहें, या / टाइप करें" },
};

/**
 * The story body editor. Content is stored as BlockNote JSON blocks.
 * Selecting words reports them so reviewers can comment on the exact text.
 */
export default function ArticleEditor({
  initialBlocks,
  language,
  editable,
  onChange,
  onSelect,
  highlightBlockIds = [],
  focusBlockId,
}: {
  initialBlocks: ArticleBlock[];
  language: Language;
  editable: boolean;
  onChange?: (blocks: ArticleBlock[]) => void;
  onSelect?: (selection: TextSelection | null) => void;
  highlightBlockIds?: string[];
  focusBlockId?: string;
}) {
  const editor = useCreateBlockNote(
    {
      schema: articleSchema,
      initialContent: initialBlocks.length ? (initialBlocks as never) : undefined,
      dictionary: {
        ...en,
        placeholders: { ...en.placeholders, emptyDocument: PLACEHOLDER[language].empty, default: PLACEHOLDER[language].line },
      },
    },
    [language],
  ) as unknown as ArticleEditorInstance;

  const theme = useMemo<Theme>(() => ({ ...lightDefaultTheme, fontFamily: FONT[language] }), [language]);

  const highlightCss = useMemo(() => {
    const ids = highlightBlockIds.filter((id) => /^[\w-]+$/.test(id));
    const rules = ids.map((id) => `.news-editor .bn-block-outer[data-id="${id}"] > .bn-block > .bn-block-content{background:var(--color-warn-soft);box-shadow:inset 3px 0 0 var(--color-warn);border-radius:4px}`);
    if (focusBlockId && /^[\w-]+$/.test(focusBlockId)) {
      rules.push(`.news-editor .bn-block-outer[data-id="${focusBlockId}"] > .bn-block > .bn-block-content{background:var(--color-brand-soft);box-shadow:inset 3px 0 0 var(--color-brand)}`);
    }
    return rules.join("\n");
  }, [highlightBlockIds, focusBlockId]);

  const reportSelection = () => {
    if (!onSelect) return;
    const quote = editor.getSelectedText().trim();
    if (!quote) return onSelect(null);
    const sel = editor.getSelection();
    const blockId = sel?.blocks[0]?.id ?? editor.getTextCursorPosition().block.id;
    onSelect({ blockId, quote });
  };

  return (
    <div lang={language} className={language === "hi" ? "news-editor lang-hi" : "news-editor"}>
      {highlightCss && <style>{highlightCss}</style>}
      <BlockNoteView
        editor={editor}
        editable={editable}
        theme={theme}
        slashMenu={false}
        onChange={() => onChange?.(editor.document as unknown as ArticleBlock[])}
        onSelectionChange={reportSelection}
      >
        <SuggestionMenuController
          triggerCharacter="/"
          getItems={async (query) =>
            filterSuggestionItems(
              [
                ...getDefaultReactSlashMenuItems(editor),
                {
                  title: "Photo or video",
                  subtext: "Upload or link. Shows details first; videos only play when clicked.",
                  aliases: ["image", "photo", "picture", "video", "media", "upload"],
                  group: "Media",
                  icon: <ImagePlay size={18} />,
                  onItemClick: () => insertOrUpdateBlockForSlashMenu(editor, { type: "media" }),
                },
              ],
              query,
            )
          }
        />
      </BlockNoteView>
    </div>
  );
}
