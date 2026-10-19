import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import clsx from "clsx";

/** A small dropdown that also works with touch: opens on tap, closes on outside tap or Escape. */
export function Menu({
  label,
  button,
  children,
  align = "left",
  className,
}: {
  label: string;
  button: ReactNode;
  children: (close: () => void) => ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  const id = useId();
  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && setOpen(false);
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    document.addEventListener("pointerdown", away);
    document.addEventListener("keydown", esc);
    return () => {
      document.removeEventListener("pointerdown", away);
      document.removeEventListener("keydown", esc);
    };
  }, [open]);
  return (
    <div ref={ref} className={clsx("relative", className)}>
      <button
        type="button"
        aria-label={label}
        title={label}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={id}
        onMouseDown={(e) => e.preventDefault()}
        onClick={() => setOpen((o) => !o)}
        className={clsx("tb-btn", open && "is-active")}
      >
        {button}
      </button>
      {open && (
        <div
          id={id}
          role="menu"
          className={clsx(
            "absolute top-full z-30 mt-1 min-w-[190px] rounded-xl border border-line bg-white p-1 shadow-lg",
            align === "right" ? "right-0" : "left-0",
          )}
        >
          {children(() => setOpen(false))}
        </div>
      )}
    </div>
  );
}

export function MenuItem({ onClick, children, active, hint }: { onClick: () => void; children: ReactNode; active?: boolean; hint?: string }) {
  return (
    <button
      type="button"
      role="menuitemradio"
      aria-checked={active}
      onMouseDown={(e) => e.preventDefault()}
      onClick={onClick}
      className={clsx("flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[14px] hover:bg-wash", active && "bg-brand-soft text-brand-deep")}
    >
      <span className="flex-1">{children}</span>
      {hint && <span className="text-[12px] text-faint">{hint}</span>}
    </button>
  );
}
