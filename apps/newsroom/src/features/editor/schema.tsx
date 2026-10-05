import { BlockNoteSchema, defaultBlockSpecs } from "@blocknote/core";
import { createReactBlockSpec } from "@blocknote/react";
import { MediaCard } from "./MediaCard";
import type { MediaValue } from "./media";

const mediaPropSchema = {
  kind: { default: "image" as const, values: ["image", "video"] as const },
  url: { default: "" },
  name: { default: "" },
  alt: { default: "" },
  caption: { default: "" },
  credit: { default: "" },
  posterUrl: { default: "" },
  width: { default: 0 },
  height: { default: 0 },
  durationSec: { default: 0 },
  sizeBytes: { default: 0 },
};

type MediaProps = { [K in keyof typeof mediaPropSchema]: (typeof mediaPropSchema)[K]["default"] extends number ? number : string } & { kind: "image" | "video" };

const toValue = (p: MediaProps): MediaValue => ({
  kind: p.kind,
  url: p.url,
  name: p.name || undefined,
  alt: p.alt,
  caption: p.caption,
  credit: p.credit,
  posterUrl: p.posterUrl || undefined,
  width: p.width || undefined,
  height: p.height || undefined,
  durationSec: p.durationSec || undefined,
  sizeBytes: p.sizeBytes || undefined,
});

const fromValue = (m: MediaValue): MediaProps => ({
  kind: m.kind,
  url: m.url,
  name: m.name ?? "",
  alt: m.alt ?? "",
  caption: m.caption ?? "",
  credit: m.credit ?? "",
  posterUrl: m.posterUrl ?? "",
  width: m.width ?? 0,
  height: m.height ?? 0,
  durationSec: m.durationSec ?? 0,
  sizeBytes: m.sizeBytes ?? 0,
});

export const MediaBlock = createReactBlockSpec(
  { type: "media", propSchema: mediaPropSchema, content: "none" },
  {
    render: ({ block, editor }) => (
      <div className="my-2 w-full">
        <MediaCard
          value={toValue(block.props as MediaProps)}
          editable={editor.isEditable}
          onChange={(m) => editor.updateBlock(block, { props: fromValue(m) })}
          onRemove={() => editor.removeBlocks([block])}
        />
      </div>
    ),
  },
);

// The built-in file blocks are replaced by one media block that shows details before playing.
const { image: _image, video: _video, audio: _audio, file: _file, ...textBlocks } = defaultBlockSpecs;

export const articleSchema = BlockNoteSchema.create({
  blockSpecs: { ...textBlocks, media: MediaBlock() },
});

export type ArticleEditorInstance = typeof articleSchema.BlockNoteEditor;
