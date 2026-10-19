/**
 * "Install the Newsroom" prompt. Chrome, Edge and Android fire `beforeinstallprompt`, which we keep and replay
 * from our own button; iPhone Safari has no such event, so it gets the two-step "Share, Add to Home Screen" hint.
 * A dismissal is remembered for 14 days; nothing shows once the app runs installed.
 */
import { useEffect, useState, useSyncExternalStore } from "react";
import { Download, Share, SquarePlus, X } from "lucide-react";

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const DISMISS_KEY = "newsroom.install.dismissed";
const QUIET_DAYS = 14;

let deferred: InstallEvent | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

if (typeof window !== "undefined") {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferred = e as InstallEvent;
    emit();
  });
  window.addEventListener("appinstalled", () => {
    deferred = null;
    emit();
  });
}

const subscribe = (l: () => void) => (listeners.add(l), () => listeners.delete(l));

function installed() {
  return window.matchMedia?.("(display-mode: standalone)").matches || (navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isIosSafari() {
  const ua = navigator.userAgent;
  const ios = /iphone|ipad|ipod/i.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  return ios && /safari/i.test(ua) && !/crios|fxios|edgios/i.test(ua);
}

function recentlyDismissed() {
  try {
    const at = Number(localStorage.getItem(DISMISS_KEY) ?? 0);
    return Date.now() - at < QUIET_DAYS * 86_400_000;
  } catch {
    return false;
  }
}

export function useInstall() {
  const event = useSyncExternalStore(subscribe, () => deferred, () => null);
  const [hidden, setHidden] = useState(recentlyDismissed);
  const ios = isIosSafari();
  const canInstall = !installed() && (!!event || ios);
  return {
    canInstall,
    ios: ios && !event,
    hidden,
    install: async () => {
      if (!deferred) return false;
      await deferred.prompt();
      const { outcome } = await deferred.userChoice;
      deferred = null;
      emit();
      return outcome === "accepted";
    },
    dismiss: () => {
      setHidden(true);
      try {
        localStorage.setItem(DISMISS_KEY, String(Date.now()));
      } catch {}
    },
  };
}

export function InstallPrompt({ variant }: { variant: "sidebar" | "sheet" | "settings" }) {
  const { canInstall, ios, hidden, install, dismiss } = useInstall();
  const [ready, setReady] = useState(false);
  // On phones, wait a moment so the prompt never covers the first thing someone wants to do.
  useEffect(() => {
    const t = window.setTimeout(() => setReady(true), variant === "sheet" ? 4000 : 0);
    return () => window.clearTimeout(t);
  }, [variant]);

  if (!canInstall || !ready) return null;

  if (variant === "settings")
    return ios ? (
      <p className="text-[13px] text-muted">On iPhone: tap <Share className="inline size-4" aria-label="Share" /> then “Add to Home Screen”.</p>
    ) : (
      <button type="button" onClick={() => void install()} className="inline-flex h-9 items-center gap-2 rounded-lg border border-line px-3 text-[14px] font-medium hover:bg-wash">
        <Download className="size-4" aria-hidden="true" /> Install the Newsroom app
      </button>
    );

  if (hidden) return null;

  if (variant === "sidebar")
    return ios ? null : (
      <div className="rounded-xl border border-line bg-white p-3 text-[12.5px]">
        <p className="font-semibold text-ink">Install the app</p>
        <p className="mt-0.5 text-muted">Opens in its own window, faster to reach.</p>
        <div className="mt-2 flex gap-2">
          <button type="button" onClick={() => void install()} className="h-8 rounded-lg bg-brand px-3 font-semibold text-white hover:bg-brand-deep">Install</button>
          <button type="button" onClick={dismiss} className="h-8 rounded-lg px-2 text-muted hover:bg-wash">Later</button>
        </div>
      </div>
    );

  return (
    <div role="dialog" aria-label="Install the Newsroom app" className="sheet-in fixed inset-x-3 bottom-[84px] z-40 rounded-2xl border border-line bg-white p-4 shadow-xl md:hidden">
      <button type="button" onClick={dismiss} aria-label="Not now" className="absolute right-2 top-2 rounded-md p-1.5 text-muted hover:bg-wash">
        <X className="size-4" />
      </button>
      <div className="flex items-start gap-3 pr-6">
        <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand font-serif text-[20px] font-semibold text-white" aria-hidden="true">N</span>
        <div className="text-[13.5px]">
          <p className="font-semibold text-ink">Put the Newsroom on your home screen</p>
          {ios ? (
            <p className="mt-1 text-muted">
              Tap <Share className="inline size-4 align-[-3px]" aria-label="Share" /> below, then <b>Add to Home Screen</b> <SquarePlus className="inline size-4 align-[-3px]" aria-hidden="true" />.
            </p>
          ) : (
            <p className="mt-1 text-muted">Open it like an app and publish in seconds, even on a weak connection.</p>
          )}
        </div>
      </div>
      {!ios && (
        <button type="button" onClick={() => void install().then((ok) => ok || dismiss())} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-brand text-[14px] font-semibold text-white">
          <Download className="size-4" aria-hidden="true" /> Install
        </button>
      )}
    </div>
  );
}
