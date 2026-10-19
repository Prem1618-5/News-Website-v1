/** Getting photos, video and voice from a phone into the story quickly. */
import { useCallback, useEffect, useRef, useState } from "react";
import { uploadMedia, type Uploaded } from "@/api/desk";

const MAX_EDGE = 2000;
const JPEG_QUALITY = 0.85;

/**
 * Phone photos are 3-8 MB; a news photo needs about 2000 px on the long edge. Shrinking in the browser makes
 * uploads 5-10x faster on mobile data. GIFs (animation) and small files are sent as they are.
 */
export async function shrinkPhoto(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type) || (file.size < 900_000 && file.type === "image/jpeg")) return file;
  let bitmap: ImageBitmap;
  try {
    bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
  } catch {
    return file;
  }
  const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
  if (scale === 1 && file.size < 1_500_000) {
    bitmap.close();
    return file;
  }
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  const ctx = canvas.getContext("2d");
  if (!ctx) return file;
  ctx.fillStyle = "#fff"; // transparent PNGs become JPEGs on white
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  const blob = await new Promise<Blob | null>((r) => canvas.toBlob(r, "image/jpeg", JPEG_QUALITY));
  return blob && blob.size < file.size ? blob : file;
}

export type PickKind = "photo" | "camera" | "video" | "any";

/** Opens the system picker. "camera" goes straight to the phone camera. */
export function pickFiles(kind: PickKind, multiple = false): Promise<File[]> {
  return new Promise((resolve) => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = kind === "video" ? "video/*" : kind === "any" ? "image/*,video/*" : "image/*";
    if (kind === "camera") input.setAttribute("capture", "environment");
    input.multiple = multiple;
    input.style.display = "none";
    input.onchange = () => {
      resolve(Array.from(input.files ?? []));
      input.remove();
    };
    // Some browsers never fire change on cancel; the promise simply stays pending, which is harmless.
    document.body.appendChild(input);
    input.click();
  });
}

export async function uploadFile(file: File, onProgress?: (f: number) => void): Promise<Uploaded> {
  const isImage = file.type.startsWith("image/");
  const body = isImage ? await shrinkPhoto(file) : file;
  const name = isImage && body !== file ? file.name.replace(/\.\w+$/, "") + ".jpg" : file.name;
  return uploadMedia(body, name || "upload", { onProgress, audio: file.type.startsWith("audio/") });
}

/** Voice recording in the browser. Returns the clip as a file ready to upload. */
export function useRecorder() {
  const [state, setState] = useState<"idle" | "recording" | "denied">("idle");
  const [seconds, setSeconds] = useState(0);
  const rec = useRef<MediaRecorder | null>(null);
  const chunks = useRef<Blob[]>([]);
  const timer = useRef<number | undefined>(undefined);
  const done = useRef<((f: File | null) => void) | null>(null);

  const stopTracks = () => rec.current?.stream.getTracks().forEach((t) => t.stop());

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setState("denied");
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const type = ["audio/webm;codecs=opus", "audio/mp4", "audio/webm"].find((t) => MediaRecorder.isTypeSupported(t));
      const r = new MediaRecorder(stream, type ? { mimeType: type } : undefined);
      chunks.current = [];
      r.ondataavailable = (e) => e.data.size && chunks.current.push(e.data);
      r.onstop = () => {
        const mime = r.mimeType || "audio/webm";
        const ext = mime.includes("mp4") ? "m4a" : "webm";
        const file = new File(chunks.current, `voice-${Date.now()}.${ext}`, { type: mime });
        stopTracks();
        done.current?.(chunks.current.length ? file : null);
        done.current = null;
      };
      rec.current = r;
      r.start(1000);
      setSeconds(0);
      timer.current = window.setInterval(() => setSeconds((s) => s + 1), 1000);
      setState("recording");
    } catch {
      setState("denied");
    }
  }, []);

  const stop = useCallback(
    () =>
      new Promise<File | null>((resolve) => {
        window.clearInterval(timer.current);
        setState("idle");
        if (!rec.current || rec.current.state === "inactive") return resolve(null);
        done.current = resolve;
        rec.current.stop();
      }),
    [],
  );

  useEffect(() => () => {
    window.clearInterval(timer.current);
    stopTracks();
  }, []);

  return { state, seconds, start, stop };
}

export const isAudioFile = (f: File) => f.type.startsWith("audio/");
