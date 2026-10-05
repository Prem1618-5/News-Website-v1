import { Check, Circle } from "lucide-react";
import clsx from "clsx";

export const MIN_PASSWORD = 8;

export function passwordChecks(password: string, avoid: string[]) {
  const lower = password.toLowerCase();
  const personal = avoid
    .flatMap((v) => v.toLowerCase().split(/[^a-z0-9]+/))
    .filter((part) => part.length >= 3)
    .some((part) => lower.includes(part));
  return [
    { id: "length", label: `At least ${MIN_PASSWORD} characters`, ok: password.length >= MIN_PASSWORD, required: true },
    { id: "mix", label: "Letters and numbers", ok: /[a-z]/i.test(password) && /\d/.test(password), required: false },
    { id: "personal", label: "Doesn't include your name or email", ok: password.length > 0 && !personal, required: false },
  ];
}

function score(password: string, checks: ReturnType<typeof passwordChecks>) {
  if (!password) return 0;
  let s = 0;
  if (password.length >= MIN_PASSWORD) s++;
  if (password.length >= 12) s++;
  if (/[a-z]/.test(password) && /[A-Z]/.test(password)) s++;
  if (/\d/.test(password) && /[^a-z0-9]/i.test(password)) s++;
  if (!checks.find((c) => c.id === "personal")?.ok) s = Math.min(s, 1);
  return Math.max(1, s);
}

const LEVELS = [
  { label: "", bar: "bg-line", text: "text-muted" },
  { label: "Weak", bar: "bg-bad", text: "text-bad" },
  { label: "Fair", bar: "bg-warn", text: "text-warn" },
  { label: "Good", bar: "bg-brand", text: "text-brand-deep" },
  { label: "Strong", bar: "bg-good", text: "text-good" },
];

export function PasswordStrength({ id, password, avoid }: { id: string; password: string; avoid: string[] }) {
  const checks = passwordChecks(password, avoid);
  const level = score(password, checks);
  const meta = LEVELS[level];

  return (
    <div id={id} className="mt-2.5">
      <div className="flex items-center gap-3">
        <div className="grid flex-1 grid-cols-4 gap-1" aria-hidden="true">
          {[1, 2, 3, 4].map((i) => (
            <span key={i} className={clsx("h-1 rounded-full transition-colors", i <= level ? meta.bar : "bg-line")} />
          ))}
        </div>
        <span className={clsx("w-12 text-right text-[12px] font-medium", meta.text)} aria-live="polite">
          {password ? <span className="sr-only">Password strength: </span> : null}
          {meta.label}
        </span>
      </div>
      <ul className="mt-2 grid gap-1 text-[12px]">
        {checks.map((c) => (
          <li key={c.id} className={clsx("flex items-center gap-1.5", c.ok ? "text-good" : "text-muted")}>
            {c.ok ? <Check className="size-3.5" aria-hidden="true" /> : <Circle className="size-3" aria-hidden="true" />}
            <span>
              {c.label}
              {!c.required && <span className="text-faint"> (recommended)</span>}
            </span>
            <span className="sr-only">{c.ok ? ", done" : ", not yet"}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
