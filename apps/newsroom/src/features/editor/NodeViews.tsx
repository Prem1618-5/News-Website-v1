import { NodeViewContent, NodeViewWrapper, type NodeViewProps } from "@tiptap/react";
import { Trash2 } from "lucide-react";
import clsx from "clsx";

const field =
  "w-full rounded-md border border-transparent bg-transparent px-1.5 py-1 text-[13px] text-muted placeholder:text-faint hover:border-line focus:border-brand focus:bg-white focus:outline-none";

/** Photo, video or audio inside the story, with its caption and credit right underneath. */
export function MediaView({ node, updateAttributes, deleteNode, editor, selected }: NodeViewProps) {
  const kind = node.type.name as "image" | "video" | "audio";
  const { src, poster, alt, caption, credit } = node.attrs as Record<string, string>;
  const editable = editor.isEditable;
  return (
    <NodeViewWrapper as="figure" className={clsx("story-media my-5", selected && "is-selected")} data-drag-handle contentEditable={false}>
      <div className="relative overflow-hidden rounded-xl bg-wash">
        {kind === "image" && <img src={src} alt={alt} className="block max-h-[520px] w-full object-contain" loading="lazy" />}
        {kind === "video" && <video src={src} poster={poster || undefined} controls preload="metadata" className="block max-h-[520px] w-full" />}
        {kind === "audio" && <audio src={src} controls preload="metadata" className="block w-full p-3" />}
        {editable && (
          <button
            type="button"
            onClick={deleteNode}
            aria-label={`Remove ${kind}`}
            className="absolute right-2 top-2 flex size-9 items-center justify-center rounded-lg bg-white/90 text-bad shadow-sm hover:bg-white"
          >
            <Trash2 className="size-4" aria-hidden="true" />
          </button>
        )}
      </div>
      {editable ? (
        <div className="mt-1 grid gap-0.5 sm:grid-cols-[1fr_200px]">
          <input className={field} value={caption} onChange={(e) => updateAttributes({ caption: e.target.value })} placeholder="Caption: what is happening here" maxLength={400} />
          <input className={field} value={credit} onChange={(e) => updateAttributes({ credit: e.target.value })} placeholder="Credit: Photo by …" maxLength={200} />
          {kind === "image" && (
            <input className={clsx(field, "sm:col-span-2")} value={alt} onChange={(e) => updateAttributes({ alt: e.target.value })} placeholder="Describe the photo for blind readers (alt text)" maxLength={300} />
          )}
        </div>
      ) : (
        (caption || credit) && (
          <figcaption className="mt-1.5 text-[13px] text-muted">
            {caption} {credit && <span className="text-faint">{credit}</span>}
          </figcaption>
        )
      )}
    </NodeViewWrapper>
  );
}

export function FactBoxView({ node, updateAttributes, editor }: NodeViewProps) {
  return (
    <NodeViewWrapper as="aside" className="fact-box my-5 rounded-xl border border-line bg-wash px-4 py-3">
      <input
        contentEditable={false}
        readOnly={!editor.isEditable}
        value={node.attrs.title as string}
        onChange={(e) => updateAttributes({ title: e.target.value })}
        aria-label="Fact box title"
        maxLength={120}
        className="mb-1 w-full bg-transparent text-[13px] font-semibold uppercase tracking-wide text-muted focus:outline-none"
      />
      <NodeViewContent className="fact-box-body" />
    </NodeViewWrapper>
  );
}
