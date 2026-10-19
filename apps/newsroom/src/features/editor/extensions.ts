/**
 * Everything the story editor understands. It matches the server's allow-list (apps/api/app/services/doc.py):
 * anything else is dropped on save, so the editor never offers it.
 */
import { Extension, Mark, Node, mergeAttributes } from "@tiptap/core";
import { ReactNodeViewRenderer } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import Highlight from "@tiptap/extension-highlight";
import { TextStyle } from "@tiptap/extension-text-style";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import { TableKit } from "@tiptap/extension-table";
import { CharacterCount, Placeholder } from "@tiptap/extensions";
import type { NoteKind } from "@/domain/types";
import { FactBoxView, MediaView } from "./NodeViews";

/** Text colours and highlight tints are named tokens; the Reader maps them to its own palette. */
export const TEXT_COLORS = [
  { id: "red", label: "Red", hi: "लाल", css: "#b42318" },
  { id: "orange", label: "Orange", hi: "नारंगी", css: "#b54708" },
  { id: "green", label: "Green", hi: "हरा", css: "#17703f" },
  { id: "blue", label: "Blue", hi: "नीला", css: "#1d4ed8" },
  { id: "purple", label: "Purple", hi: "बैंगनी", css: "#6b3fd6" },
  { id: "gray", label: "Grey", hi: "धूसर", css: "#6b6e80" },
] as const;
export const HIGHLIGHTS = [
  { id: "yellow", label: "Yellow", css: "#fff1a8" },
  { id: "green", label: "Green", css: "#d9f2e1" },
  { id: "blue", label: "Blue", css: "#dce8ff" },
  { id: "pink", label: "Pink", css: "#fbe0ec" },
] as const;
export type TextColor = (typeof TEXT_COLORS)[number]["id"];
export type HighlightColor = (typeof HIGHLIGHTS)[number]["id"];

export interface MediaAttrs {
  src: string;
  poster?: string;
  alt?: string;
  caption?: string;
  credit?: string;
}

declare module "@tiptap/core" {
  interface Commands<ReturnType> {
    media: {
      insertMedia: (kind: "image" | "video" | "audio", attrs: MediaAttrs) => ReturnType;
    };
    pullQuote: {
      togglePullQuote: () => ReturnType;
    };
    factBox: {
      insertFactBox: () => ReturnType;
    };
    textColor: {
      setTextColor: (color: TextColor) => ReturnType;
      unsetTextColor: () => ReturnType;
    };
    note: {
      setNote: (id: string, kind: NoteKind) => ReturnType;
    };
  }
}

const mediaAttributes = {
  src: { default: "" },
  poster: { default: "" },
  alt: { default: "" },
  caption: { default: "" },
  credit: { default: "" },
};

function mediaNode(kind: "image" | "video" | "audio") {
  return Node.create({
    name: kind,
    group: "block",
    atom: true,
    draggable: true,
    selectable: true,
    addAttributes: () => mediaAttributes,
    parseHTML: () => [{ tag: `figure[data-media="${kind}"]` }],
    renderHTML: ({ HTMLAttributes }) => ["figure", mergeAttributes({ "data-media": kind }, { "data-src": HTMLAttributes.src })],
    addNodeView: () => ReactNodeViewRenderer(MediaView),
  });
}

const MediaCommands = Extension.create({
  name: "mediaCommands",
  addCommands: () => ({
    insertMedia:
      (kind, attrs) =>
      ({ commands }) =>
        commands.insertContent([{ type: kind, attrs }, { type: "paragraph" }]),
  }),
});

export const ImageNode = mediaNode("image");
export const VideoNode = mediaNode("video");
export const AudioNode = mediaNode("audio");

/** A quote set large in the story, with who said it. */
export const PullQuote = Node.create({
  name: "pullQuote",
  group: "block",
  content: "paragraph+",
  defining: true,
  addAttributes: () => ({ cite: { default: "" } }),
  parseHTML: () => [{ tag: "blockquote[data-pull]" }],
  renderHTML: ({ HTMLAttributes }) => ["blockquote", mergeAttributes({ "data-pull": "", class: "pull-quote" }, { "data-cite": HTMLAttributes.cite }), 0],
  addCommands() {
    return {
      togglePullQuote:
        () =>
        ({ commands }) =>
          commands.toggleWrap(this.name),
    };
  },
});

/** A boxed "Key facts" panel inside the story. */
export const FactBox = Node.create({
  name: "factBox",
  group: "block",
  content: "(paragraph | bulletList | orderedList | heading)+",
  defining: true,
  isolating: true,
  addAttributes: () => ({ title: { default: "Key facts" } }),
  parseHTML: () => [{ tag: "aside[data-factbox]" }],
  renderHTML: ({ HTMLAttributes }) => ["aside", mergeAttributes({ "data-factbox": "" }, { "data-title": HTMLAttributes.title }), 0],
  addNodeView: () => ReactNodeViewRenderer(FactBoxView),
  addCommands() {
    return {
      insertFactBox:
        () =>
        ({ commands }) =>
          commands.insertContent({ type: this.name, attrs: { title: "Key facts" }, content: [{ type: "bulletList", content: [{ type: "listItem", content: [{ type: "paragraph" }] }] }] }),
    };
  },
});

/** Text colour from the fixed palette (stored as a token on the textStyle mark). */
export const TextColorExt = Extension.create({
  name: "textColor",
  addGlobalAttributes: () => [
    {
      types: ["textStyle"],
      attributes: {
        color: {
          default: null,
          // Pasted colours never come through: only our own data-color survives.
          parseHTML: (el) => el.getAttribute("data-color"),
          renderHTML: (attrs) => (attrs.color ? { "data-color": attrs.color, class: `tc tc-${attrs.color}` } : {}),
        },
      },
    },
  ],
  addCommands: () => ({
    setTextColor:
      (color) =>
      ({ chain }) =>
        chain().setMark("textStyle", { color }).run(),
    unsetTextColor:
      () =>
      ({ chain }) =>
        chain().setMark("textStyle", { color: null }).removeEmptyTextStyle().run(),
  }),
});

/** Soft tints instead of the browser's yellow. */
const SoftHighlight = Highlight.extend({
  addAttributes() {
    return {
      color: {
        default: "yellow",
        parseHTML: (el) => el.getAttribute("data-color") || "yellow",
        renderHTML: (attrs) => ({ "data-color": attrs.color, class: `hl hl-${attrs.color}` }),
      },
    };
  },
}).configure({ multicolor: true });

/**
 * A review highlight. Seniors mark a problem, a suggested rewording or a comment on a passage; the mark
 * travels with the words as the story is edited and is stripped when the story is published.
 */
export const NoteMark = Mark.create({
  name: "note",
  inclusive: false,
  excludes: "",
  addAttributes: () => ({
    id: { default: "" },
    kind: { default: "comment" },
  }),
  parseHTML: () => [{ tag: "span[data-note]" }],
  renderHTML: ({ HTMLAttributes }) => [
    "span",
    mergeAttributes({ "data-note": HTMLAttributes.id, "data-kind": HTMLAttributes.kind, class: `note note-${HTMLAttributes.kind}` }),
    0,
  ],
  addCommands() {
    return {
      setNote:
        (id, kind) =>
        ({ commands }) =>
          commands.setMark(this.name, { id, kind }),
    };
  },
});

export function storyExtensions(opts: { placeholder: string }) {
  return [
    StarterKit.configure({
      heading: { levels: [2, 3] },
      codeBlock: false,
      code: false,
      link: { openOnClick: false, autolink: true, defaultProtocol: "https", protocols: ["http", "https", "mailto"], HTMLAttributes: { rel: "noopener noreferrer nofollow", target: null } },
    }),
    TextAlign.configure({ types: ["heading", "paragraph"], alignments: ["left", "center", "right", "justify"] }),
    TextStyle,
    TextColorExt,
    SoftHighlight,
    Subscript,
    Superscript,
    TableKit.configure({ table: { resizable: false, HTMLAttributes: { class: "story-table" } } }),
    Placeholder.configure({ placeholder: opts.placeholder }),
    CharacterCount,
    ImageNode,
    VideoNode,
    AudioNode,
    MediaCommands,
    PullQuote,
    FactBox,
    NoteMark,
  ];
}
