import { useState } from "react";
import { Check, Copy, MessageCircle } from "lucide-react";

/** A one-time link to hand over: copy it, or send it on WhatsApp. */
export function ShareLink({ link, message }: { link: string; message: string }) {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2000);
    } catch {
      window.prompt("Copy this link", link);
    }
  };
  return (
    <div className="space-y-2">
      <input readOnly value={link} onFocus={(e) => e.currentTarget.select()} aria-label="Link" className="h-9 w-full rounded-lg border border-line bg-wash px-3 text-[12.5px] text-muted" />
      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void copy()} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-line px-3 text-[13px] font-medium hover:bg-wash">
          {copied ? <Check className="size-4 text-good" aria-hidden="true" /> : <Copy className="size-4" aria-hidden="true" />}
          {copied ? "Copied" : "Copy link"}
        </button>
        <a
          href={`https://wa.me/?text=${encodeURIComponent(`${message} ${link}`)}`}
          target="_blank"
          rel="noreferrer"
          className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-[#1f9d55] px-3 text-[13px] font-medium text-white hover:bg-[#178a49]"
        >
          <MessageCircle className="size-4" aria-hidden="true" /> Send on WhatsApp
        </a>
      </div>
    </div>
  );
}
