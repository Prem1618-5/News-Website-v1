/** The lead photo or video: one tap to open the camera on a phone, or pick from the gallery or computer. */
import { useState } from "react";
import { Camera, Images, RefreshCw, Trash2, Video } from "lucide-react";
import clsx from "clsx";
import type { Hero, Lang } from "@/domain/types";
import { pickFiles, uploadFile, type PickKind } from "@/features/editor/media";

const field =
  "w-full rounded-lg border border-line bg-white px-2.5 py-1.5 text-[13.5px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

const t = (lang: Lang, en: string, hi: string) => (lang === "hi" ? hi : en);

export function HeroPicker({
  hero, editable, lang, onChange, toast,
}: {
  hero: Hero | null;
  editable: boolean;
  lang: Lang;
  onChange: (h: Hero | null) => void;
  toast: (t: string, tone?: "info" | "error" | "success") => void;
}) {
  const [progress, setProgress] = useState<number | null>(null);
  const [drag, setDrag] = useState(false);

  const take = async (files: File[]) => {
    const file = files[0];
    if (!file) return;
    if (!/^(image|video)\//.test(file.type)) return toast(t(lang, "Choose a photo or a video.", "फ़ोटो या वीडियो चुनें।"), "error");
    setProgress(0);
    try {
      const up = await uploadFile(file, setProgress);
      onChange({ kind: up.kind === "video" ? "video" : "image", src: up.url, poster: "", alt: hero?.alt ?? "", caption: hero?.caption ?? "", credit: hero?.credit ?? "" });
    } catch (err) {
      toast((err as Error).message, "error");
    } finally {
      setProgress(null);
    }
  };
  const pick = async (kind: PickKind) => take(await pickFiles(kind));

  if (!hero?.src) {
    if (!editable) return null;
    return (
      <div
        onDragOver={(e) => (e.preventDefault(), setDrag(true))}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          void take(Array.from(e.dataTransfer.files));
        }}
        className={clsx("rounded-2xl border-2 border-dashed px-4 py-5 text-center transition-colors", drag ? "border-brand bg-brand-soft" : "border-line bg-wash/60")}
      >
        {progress !== null ? (
          <div role="status" className="mx-auto max-w-xs">
            <p className="text-[14px] font-medium">{t(lang, "Uploading…", "अपलोड हो रहा है…")} {Math.round(progress * 100)}%</p>
            <span className="mt-2 block h-1.5 overflow-hidden rounded-full bg-white"><span className="block h-full bg-brand" style={{ width: `${progress * 100}%` }} /></span>
          </div>
        ) : (
          <>
            <p className="text-[14px] font-medium text-ink">{t(lang, "Add the main photo or video", "मुख्य फ़ोटो या वीडियो जोड़ें")}</p>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <button type="button" onClick={() => void pick("camera")} className="inline-flex h-11 items-center gap-2 rounded-xl bg-brand px-4 text-[14px] font-semibold text-white hover:bg-brand-deep sm:hidden">
                <Camera className="size-5" aria-hidden="true" /> {t(lang, "Camera", "कैमरा")}
              </button>
              <button type="button" onClick={() => void pick("photo")} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[14px] font-medium hover:bg-wash">
                <Images className="size-5" aria-hidden="true" /> {t(lang, "Photo", "फ़ोटो")}
              </button>
              <button type="button" onClick={() => void pick("video")} className="inline-flex h-11 items-center gap-2 rounded-xl border border-line bg-white px-4 text-[14px] font-medium hover:bg-wash">
                <Video className="size-5" aria-hidden="true" /> {t(lang, "Video", "वीडियो")}
              </button>
            </div>
            <p className="mt-2 text-[12px] text-faint max-sm:hidden">{t(lang, "or drop a file here", "या फ़ाइल यहाँ छोड़ें")}</p>
          </>
        )}
      </div>
    );
  }

  const set = (patch: Partial<Hero>) => onChange({ ...hero, ...patch });
  return (
    <figure className="m-0">
      <div className="relative overflow-hidden rounded-2xl bg-wash">
        {hero.kind === "video" ? (
          <video src={hero.src} poster={hero.poster || undefined} controls preload="metadata" className="block max-h-[460px] w-full" />
        ) : (
          <img src={hero.src} alt={hero.alt} className="block max-h-[460px] w-full object-cover" />
        )}
        {progress !== null && <span role="status" className="absolute inset-x-0 bottom-0 h-1.5 bg-white/70"><span className="block h-full bg-brand" style={{ width: `${progress * 100}%` }} /></span>}
        {editable && (
          <div className="absolute right-2 top-2 flex gap-1.5">
            <button type="button" onClick={() => void pick("any")} aria-label={t(lang, "Replace", "बदलें")} title={t(lang, "Replace", "बदलें")} className="flex size-9 items-center justify-center rounded-lg bg-white/90 text-ink shadow-sm hover:bg-white">
              <RefreshCw className="size-4" aria-hidden="true" />
            </button>
            <button type="button" onClick={() => onChange(null)} aria-label={t(lang, "Remove", "हटाएँ")} title={t(lang, "Remove", "हटाएँ")} className="flex size-9 items-center justify-center rounded-lg bg-white/90 text-bad shadow-sm hover:bg-white">
              <Trash2 className="size-4" aria-hidden="true" />
            </button>
          </div>
        )}
      </div>
      {editable ? (
        <div className="mt-2 grid gap-1.5 sm:grid-cols-2">
          <input className={field} value={hero.caption} onChange={(e) => set({ caption: e.target.value })} placeholder={t(lang, "Caption", "कैप्शन")} maxLength={400} />
          <input className={field} value={hero.credit} onChange={(e) => set({ credit: e.target.value })} placeholder={t(lang, "Credit (Photo: name)", "श्रेय (फ़ोटो: नाम)")} maxLength={200} />
          {hero.kind === "image" && (
            <input className={clsx(field, "sm:col-span-2")} value={hero.alt} onChange={(e) => set({ alt: e.target.value })} placeholder={t(lang, "Describe the photo for blind readers", "दृष्टिबाधित पाठकों के लिए फ़ोटो का वर्णन")} maxLength={300} />
          )}
        </div>
      ) : (
        (hero.caption || hero.credit) && <figcaption className="mt-1.5 text-[13px] text-muted">{hero.caption} <span className="text-faint">{hero.credit}</span></figcaption>
      )}
    </figure>
  );
}
