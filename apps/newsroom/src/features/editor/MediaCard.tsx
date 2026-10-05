import { useId, useRef, useState, type KeyboardEvent } from "react";
import { Film, ImageIcon, Link2, Play, RefreshCw, Trash2, Upload } from "lucide-react";
import clsx from "clsx";
import { ACCEPT_MEDIA, formatBytes, formatDuration, mediaFromFile, mediaFromUrl, type MediaValue } from "./media";

const stop = (e: KeyboardEvent) => e.stopPropagation();

/**
 * Photo or video with its details shown straight away. Videos never autoplay:
 * the card shows the first frame and only plays after an explicit click.
 */
export function MediaCard({
  value,
  onChange,
  onRemove,
  editable = true,
  label = "Photo or video",
  showCredit = true,
}: {
  value?: MediaValue;
  onChange: (next: MediaValue) => void;
  onRemove?: () => void;
  editable?: boolean;
  label?: string;
  showCredit?: boolean;
}) {
  if (!value?.url) return editable ? <MediaPicker label={label} onPick={onChange} /> : null;
  return <MediaDetails value={value} onChange={onChange} onRemove={onRemove} editable={editable} showCredit={showCredit} />;
}

function MediaPicker({ label, onPick }: { label: string; onPick: (m: MediaValue) => void }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [link, setLink] = useState("");
  const [error, setError] = useState<string>();
  const [busy, setBusy] = useState(false);
  const [dragging, setDragging] = useState(false);

  const accept = async (result: Promise<MediaValue | { error: string }>) => {
    setBusy(true);
    setError(undefined);
    const out = await result;
    setBusy(false);
    if ("error" in out) setError(out.error);
    else onPick(out);
  };

  return (
    <div
      contentEditable={false}
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(e) => {
        e.preventDefault();
        setDragging(false);
        const file = e.dataTransfer.files?.[0];
        if (file) void accept(mediaFromFile(file));
      }}
      className={clsx(
        "flex flex-col items-center gap-3 rounded-xl border border-dashed px-4 py-6 text-center transition-colors",
        dragging ? "border-brand bg-brand-soft" : "border-line bg-wash",
      )}
    >
      <div className="flex items-center gap-2 text-muted">
        <ImageIcon className="size-5" aria-hidden="true" />
        <Film className="size-5" aria-hidden="true" />
      </div>
      <div>
        <p className="text-[14px] font-medium text-ink">{label}</p>
        <p className="text-[12px] text-muted">Drop a file here, choose one, or paste a link. Up to 200 MB.</p>
      </div>
      <div className="flex w-full max-w-md flex-col gap-2 sm:flex-row">
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={busy}
          className="inline-flex h-9 shrink-0 items-center justify-center gap-1.5 rounded-lg bg-brand px-3.5 text-[14px] font-medium text-white hover:bg-brand-deep disabled:opacity-60"
        >
          <Upload className="size-4" aria-hidden="true" /> {busy ? "Reading file..." : "Choose file"}
        </button>
        <form
          className="flex min-w-0 flex-1 gap-2"
          onSubmit={(e) => {
            e.preventDefault();
            if (link.trim()) void accept(mediaFromUrl(link));
          }}
        >
          <label className="sr-only" htmlFor={`${label}-link`}>
            Media link
          </label>
          <input
            id={`${label}-link`}
            value={link}
            onKeyDown={stop}
            onChange={(e) => setLink(e.target.value)}
            placeholder="https://..."
            className="h-9 min-w-0 flex-1 rounded-lg border border-line bg-white px-3 text-[14px] placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20"
          />
          <button type="submit" aria-label="Add from link" className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-line bg-white text-ink hover:bg-wash">
            <Link2 className="size-4" aria-hidden="true" />
          </button>
        </form>
      </div>
      {error && (
        <p role="alert" className="text-[12px] text-bad">
          {error}
        </p>
      )}
      <input
        ref={inputRef}
        type="file"
        accept={ACCEPT_MEDIA}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => {
          const file = e.target.files?.[0];
          e.target.value = "";
          if (file) void accept(mediaFromFile(file));
        }}
      />
    </div>
  );
}

function MediaDetails({
  value,
  onChange,
  onRemove,
  editable,
  showCredit,
}: {
  value: MediaValue;
  onChange: (next: MediaValue) => void;
  onRemove?: () => void;
  editable: boolean;
  showCredit: boolean;
}) {
  const [playing, setPlaying] = useState(false);
  const [replacing, setReplacing] = useState(false);
  const altId = useId();
  const capId = useId();
  const creditId = useId();

  if (replacing) {
    return (
      <div className="space-y-2">
        <MediaPicker
          label="Replace photo or video"
          onPick={(m) => {
            setReplacing(false);
            setPlaying(false);
            onChange({ ...m, alt: value.alt, credit: value.credit, caption: value.caption });
          }}
        />
        <button type="button" className="text-[13px] text-muted underline-offset-2 hover:underline" onClick={() => setReplacing(false)}>
          Keep the current one
        </button>
      </div>
    );
  }

  const facts = [
    value.kind === "video" ? "Video" : "Photo",
    value.width && value.height ? `${value.width} × ${value.height}` : undefined,
    formatDuration(value.durationSec),
    formatBytes(value.sizeBytes),
  ].filter(Boolean);

  const ratio = value.width && value.height ? `${value.width} / ${value.height}` : "16 / 9";

  return (
    <figure contentEditable={false} className="overflow-hidden rounded-xl border border-line bg-white">
      <div className="relative w-full bg-ink/5" style={{ aspectRatio: ratio, maxHeight: 420 }}>
        {value.kind === "image" ? (
          <img src={value.url} alt={value.alt || ""} crossOrigin="anonymous" className="size-full object-contain" />
        ) : playing ? (
          <video src={value.url} poster={value.posterUrl} controls autoPlay playsInline className="size-full bg-black object-contain">
            <track kind="captions" />
          </video>
        ) : (
          <>
            <video
              src={`${value.url}${value.url.includes("#") ? "" : "#t=0.1"}`}
              poster={value.posterUrl}
              preload="metadata"
              muted
              playsInline
              tabIndex={-1}
              aria-hidden="true"
              className="pointer-events-none size-full bg-black object-contain"
            />
            <button
              type="button"
              onClick={() => setPlaying(true)}
              className="absolute inset-0 flex items-center justify-center bg-ink/25 text-white transition-colors hover:bg-ink/35"
              aria-label={`Play video ${value.name ?? ""}`}
            >
              <span className="flex size-14 items-center justify-center rounded-full bg-white/95 text-ink shadow-lg">
                <Play className="ml-0.5 size-6 fill-current" aria-hidden="true" />
              </span>
            </button>
          </>
        )}
      </div>

      <div className="space-y-3 p-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="min-w-0">
            <p className="truncate text-[13px] font-medium text-ink" title={value.name}>
              {value.name || "Untitled media"}
            </p>
            <p className="text-[12px] text-muted">{facts.join(" · ")}</p>
          </div>
          {editable && (
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                onClick={() => setReplacing(true)}
                className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-line bg-white px-2.5 text-[13px] font-medium text-ink hover:bg-wash"
              >
                <RefreshCw className="size-3.5" aria-hidden="true" /> Replace
              </button>
              {onRemove && (
                <button
                  type="button"
                  onClick={onRemove}
                  aria-label="Remove media"
                  className="inline-flex size-8 items-center justify-center rounded-lg text-muted hover:bg-bad-soft hover:text-bad"
                >
                  <Trash2 className="size-4" aria-hidden="true" />
                </button>
              )}
            </div>
          )}
        </div>

        {editable ? (
          <div className={clsx("grid gap-2", showCredit ? "sm:grid-cols-2" : "")}>
            <div className="space-y-1 sm:col-span-2">
              <label htmlFor={altId} className="text-[12px] font-medium text-ink">
                Describe it for people who cannot see it
              </label>
              <input
                id={altId}
                value={value.alt}
                onKeyDown={stop}
                onChange={(e) => onChange({ ...value, alt: e.target.value })}
                placeholder="e.g. Rescue boats on a flooded street at dusk"
                className={clsx(fieldCls, !value.alt.trim() && "border-warn/50")}
              />
            </div>
            <div className="space-y-1">
              <label htmlFor={capId} className="text-[12px] font-medium text-ink">
                Caption
              </label>
              <input id={capId} value={value.caption ?? ""} onKeyDown={stop} onChange={(e) => onChange({ ...value, caption: e.target.value })} className={fieldCls} />
            </div>
            {showCredit && (
              <div className="space-y-1">
                <label htmlFor={creditId} className="text-[12px] font-medium text-ink">
                  Credit
                </label>
                <input
                  id={creditId}
                  value={value.credit}
                  onKeyDown={stop}
                  onChange={(e) => onChange({ ...value, credit: e.target.value })}
                  placeholder="Photographer / agency"
                  className={clsx(fieldCls, !value.credit.trim() && "border-warn/50")}
                />
              </div>
            )}
          </div>
        ) : (
          (value.caption || value.credit) && (
            <figcaption className="text-[13px] text-muted">
              {value.caption}
              {value.credit && <span className="text-faint"> {value.credit}</span>}
            </figcaption>
          )
        )}
      </div>
    </figure>
  );
}

const fieldCls =
  "h-8 w-full rounded-lg border border-line bg-white px-2.5 text-[13px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
