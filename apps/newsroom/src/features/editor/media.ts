import type { HeroMedia } from "@/domain/types";

export type MediaValue = HeroMedia;

export const ACCEPT_MEDIA = "image/jpeg,image/png,image/webp,image/gif,image/avif,video/mp4,video/webm,video/quicktime";
const MAX_BYTES = 200 * 1024 * 1024;

const VIDEO_EXT = /\.(mp4|webm|mov|m4v)(\?|#|$)/i;

export function kindFromUrl(url: string): MediaValue["kind"] {
  return VIDEO_EXT.test(url) ? "video" : "image";
}

export function fileNameFromUrl(url: string): string {
  try {
    const path = new URL(url, window.location.href).pathname;
    return decodeURIComponent(path.split("/").pop() || "media");
  } catch {
    return "media";
  }
}

/** Reads size, dimensions and duration without playing anything. */
export function probeMedia(url: string, kind: MediaValue["kind"]): Promise<Pick<MediaValue, "width" | "height" | "durationSec">> {
  return new Promise((resolve) => {
    if (kind === "image") {
      const img = new Image();
      img.crossOrigin = "anonymous";
      img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
      img.onerror = () => resolve({});
      img.src = url;
      return;
    }
    const video = document.createElement("video");
    video.preload = "metadata";
    video.muted = true;
    video.onloadedmetadata = () => resolve({ width: video.videoWidth, height: video.videoHeight, durationSec: Math.round(video.duration || 0) });
    video.onerror = () => resolve({});
    video.src = url;
  });
}

export async function mediaFromFile(file: File): Promise<MediaValue | { error: string }> {
  const kind = file.type.startsWith("video/") ? "video" : file.type.startsWith("image/") ? "image" : null;
  if (!kind) return { error: "That file type is not supported. Use a photo (JPG, PNG, WebP) or a video (MP4, WebM)." };
  if (file.size > MAX_BYTES) return { error: "That file is larger than 200 MB." };
  const url = URL.createObjectURL(file);
  const meta = await probeMedia(url, kind);
  return { kind, url, name: file.name, sizeBytes: file.size, alt: "", credit: "", caption: "", ...meta };
}

export async function mediaFromUrl(raw: string): Promise<MediaValue | { error: string }> {
  const url = raw.trim();
  if (!/^(https?:\/\/|\/)/.test(url)) return { error: "Paste a full link that starts with https://" };
  const kind = kindFromUrl(url);
  const meta = await probeMedia(url, kind);
  return { kind, url, name: fileNameFromUrl(url), alt: "", credit: "", caption: "", ...meta };
}

export function formatBytes(n?: number): string | undefined {
  if (!n) return undefined;
  if (n < 1024 * 1024) return `${Math.max(1, Math.round(n / 1024))} KB`;
  return `${(n / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatDuration(sec?: number): string | undefined {
  if (!sec) return undefined;
  const m = Math.floor(sec / 60);
  const s = String(sec % 60).padStart(2, "0");
  return `${m}:${s}`;
}
