import { useEffect, useId, useRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import { formatRemaining } from "@/domain/sla";
import { SECTION_COLOR, SECTION_LABEL, type SectionKey, type Staff } from "@/domain/types";
import { useNow } from "@/state/store";

export const inputCls =
  "h-9 w-full rounded-lg border border-line bg-white px-3 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";
export const textareaCls =
  "w-full rounded-lg border border-line bg-white px-3 py-2 text-[14px] text-ink placeholder:text-faint focus:border-brand focus:outline-none focus:ring-2 focus:ring-brand/20";

const PALETTE = ["#dfe6fb", "#e4f0e8", "#f6e6d8", "#eadff5", "#f5dfe9", "#dcecef", "#efe9d3"];

export function Avatar({ person, size = 28 }: { person?: Pick<Staff, "name" | "id">; size?: number }) {
  const name = person?.name ?? "System";
  const initials = name.split(" ").map((p) => p[0]).slice(0, 2).join("").toUpperCase();
  const idx = [...(person?.id ?? "sys")].reduce((n, c) => n + c.charCodeAt(0), 0) % PALETTE.length;
  return (
    <span
      aria-hidden="true"
      className="inline-flex shrink-0 items-center justify-center rounded-full font-semibold text-ink/70"
      style={{ width: size, height: size, background: PALETTE[idx], fontSize: Math.max(10, size * 0.38) }}
    >
      {initials}
    </span>
  );
}

type Tone = "neutral" | "good" | "bad" | "warn" | "brand" | "dark";
const toneCls: Record<Tone, string> = {
  neutral: "border-line bg-white text-muted",
  good: "border-transparent bg-good-soft text-good",
  bad: "border-transparent bg-bad-soft text-bad",
  warn: "border-transparent bg-warn-soft text-warn",
  brand: "border-transparent bg-brand-soft text-brand-deep",
  dark: "border-transparent bg-ink text-white",
};

export function Pill({ tone = "neutral", children, className }: { tone?: Tone; children: ReactNode; className?: string }) {
  return (
    <span className={clsx("inline-flex h-[22px] shrink-0 items-center gap-1 whitespace-nowrap rounded-md border px-2 text-[12px] font-medium", toneCls[tone], className)}>
      {children}
    </span>
  );
}

export function SectionDot({ section, label = true }: { section: SectionKey; label?: boolean }) {
  return (
    <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-ink">
      <span className="size-2 rounded-full" style={{ background: SECTION_COLOR[section] }} />
      {label && SECTION_LABEL[section]}
    </span>
  );
}

type BtnVariant = "primary" | "secondary" | "ghost" | "danger";
export function Button({
  variant = "secondary",
  size = "md",
  className,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: BtnVariant; size?: "sm" | "md" }) {
  return (
    <button
      {...rest}
      className={clsx(
        "inline-flex shrink-0 items-center justify-center gap-1.5 whitespace-nowrap rounded-lg font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50",
        size === "md" ? "h-9 px-3.5 text-[14px]" : "h-8 px-3 text-[13px]",
        variant === "primary" && "bg-brand text-white hover:bg-brand-deep",
        variant === "secondary" && "border border-line bg-white text-ink hover:bg-wash",
        variant === "ghost" && "text-muted hover:bg-wash hover:text-ink",
        variant === "danger" && "border border-bad/30 bg-white text-bad hover:bg-bad-soft",
        className,
      )}
    />
  );
}

export function Tabs<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; count?: number }[];
  label: string;
}) {
  return (
    <div role="tablist" aria-label={label} className="flex flex-wrap items-center gap-2">
      {items.map((it) => {
        const active = it.id === value;
        return (
          <button
            key={it.id}
            role="tab"
            aria-selected={active}
            onClick={() => onChange(it.id)}
            className={clsx(
              "inline-flex h-8 items-center gap-1.5 rounded-full px-3.5 text-[13px] font-medium transition-colors",
              active ? "bg-brand-soft text-[#272b5a]" : "border border-line bg-white text-muted hover:bg-wash hover:text-ink",
            )}
          >
            {it.label}
            {it.count !== undefined && <span className={clsx("text-[12px]", active ? "text-brand-deep" : "text-faint")}>{it.count}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function Segmented<T extends string>({
  value,
  onChange,
  items,
  label,
}: {
  value: T;
  onChange: (v: T) => void;
  items: { id: T; label: string; icon?: ReactNode }[];
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg bg-select p-0.5">
      {items.map((it) => (
        <button
          key={it.id}
          role="radio"
          aria-checked={it.id === value}
          onClick={() => onChange(it.id)}
          className={clsx(
            "inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-[13px] font-medium transition-colors",
            it.id === value ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink",
          )}
        >
          {it.icon}
          {it.label}
        </button>
      ))}
    </div>
  );
}

export function PageHeader({ title, children, subtitle }: { title: string; subtitle?: string; children?: ReactNode }) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-[28px] font-normal leading-tight tracking-tight text-ink">{title}</h1>
        {subtitle && <p className="mt-1 text-[14px] text-muted">{subtitle}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Card({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={clsx("rounded-2xl border border-line bg-white", className)}>{children}</section>;
}

export function CardTitle({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="mb-3 flex items-center justify-between gap-2">
      <h2 className="text-[14px] font-medium text-muted">{children}</h2>
      {action}
    </div>
  );
}

export function Field({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-[13px] font-medium text-ink">
        {label}
      </label>
      <FieldChild id={id}>{children}</FieldChild>
      {hint && <p className="text-[12px] text-muted">{hint}</p>}
    </div>
  );
}

function FieldChild({ id, children }: { id: string; children: ReactNode }) {
  // Wrap so the label's htmlFor resolves to the first control.
  return (
    <div
      ref={(el) => {
        const control = el?.querySelector("input,select,textarea");
        if (control && !control.id) control.id = id;
      }}
    >
      {children}
    </div>
  );
}

export function EmptyState({ title, body }: { title: string; body?: string }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-[15px] font-medium text-ink">{title}</p>
      {body && <p className="mx-auto mt-1 max-w-sm text-[13px] text-muted">{body}</p>}
    </div>
  );
}

export function Countdown({ to, className }: { to: number; className?: string }) {
  const now = useNow(1000);
  const ms = to - now;
  return (
    <span className={clsx("tabular-nums", ms < 0 && "text-bad", ms >= 0 && ms < 15 * 60_000 && "text-warn", className)}>{formatRemaining(ms)}</span>
  );
}

export function timeAgo(at: number, now = Date.now()): string {
  const s = Math.max(0, Math.floor((now - at) / 1000));
  if (s < 60) return "just now";
  const m = Math.floor(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.floor(m / 60);
  if (h < 48) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return d === 1 ? "Yesterday" : `${d} days ago`;
}

export function shortDate(at: number): string {
  return new Date(at).toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function useEscape(onClose: () => void) {
  useEffect(() => {
    const h = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", h);
    return () => window.removeEventListener("keydown", h);
  }, [onClose]);
}

export function Drawer({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const closeRef = useRef<HTMLButtonElement>(null);
  useEscape(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    return () => prev?.focus?.();
  }, []);
  return createPortal(
    <div className="fixed inset-0 top-0 z-40 sm:left-auto">
      <button aria-label="Close panel" tabIndex={-1} onClick={onClose} className="absolute inset-0 bg-ink/10 sm:bg-transparent" />
      <aside
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="drawer-in absolute inset-y-0 right-0 flex w-full flex-col bg-white shadow-[0_8px_40px_rgba(27,29,43,0.18)] sm:inset-y-3 sm:right-3 sm:w-[440px] sm:rounded-2xl sm:border sm:border-line"
      >
        <header className="flex items-start justify-between gap-3 border-b border-line px-5 py-4">
          <h2 id={titleId} className="font-serif text-[18px] font-medium leading-snug text-ink">
            {title}
          </h2>
          <button ref={closeRef} onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-wash hover:text-ink">
            <X className="size-5" />
          </button>
        </header>
        <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="border-t border-line px-5 py-3">{footer}</footer>}
      </aside>
    </div>,
    document.body,
  );
}

export function Modal({ title, onClose, children, footer }: { title: string; onClose: () => void; children: ReactNode; footer?: ReactNode }) {
  const titleId = useId();
  const ref = useRef<HTMLDivElement>(null);
  useEscape(onClose);
  useEffect(() => {
    const prev = document.activeElement as HTMLElement | null;
    ref.current?.querySelector<HTMLElement>("input,select,textarea,button")?.focus();
    return () => prev?.focus?.();
  }, []);
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-ink/30 p-0 sm:items-center sm:p-4" onMouseDown={(e) => e.target === e.currentTarget && onClose()}>
      <div ref={ref} role="dialog" aria-modal="true" aria-labelledby={titleId} className="flex max-h-[92vh] w-full flex-col rounded-t-2xl bg-white shadow-xl sm:max-w-[480px] sm:rounded-2xl">
        <header className="flex items-center justify-between border-b border-line px-5 py-4">
          <h2 id={titleId} className="text-[16px] font-semibold">
            {title}
          </h2>
          <button onClick={onClose} aria-label="Close" className="rounded-md p-1 text-muted hover:bg-wash hover:text-ink">
            <X className="size-5" />
          </button>
        </header>
        <div className="space-y-4 overflow-y-auto px-5 py-4">{children}</div>
        {footer && <footer className="flex justify-end gap-2 border-t border-line px-5 py-3">{footer}</footer>}
      </div>
    </div>,
    document.body,
  );
}
