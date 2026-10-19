import type { ReactNode } from "react";
import { Camera, FileCheck2, PenLine, Send, Siren, TrendingUp } from "lucide-react";

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "?";
  return (parts[0][0] + (parts.length > 1 ? parts[parts.length - 1][0] : "")).toUpperCase();
}

const SIGNIN_POINTS = [
  { icon: Camera, title: "From your phone", text: "Take a photo, write the headline and a few lines. It saves as you type." },
  { icon: Send, title: "One tap to send", text: "Choose who it is for and how urgent it is, then publish or send to your editor." },
  { icon: Siren, title: "Breaking news first", text: "Breaking stories reach every editor at once and top readers' feeds." },
];

const SIGNUP_STEPS = [
  { icon: PenLine, title: "Write and send", text: "Write or paste the story, add photos, and send it when it's ready." },
  { icon: FileCheck2, title: "An editor reviews", text: "Your editor highlights what to fix or fixes it, and you see every change." },
  { icon: TrendingUp, title: "Become trusted", text: "Trusted reporters publish straight away." },
];

function Shell({ eyebrow, children }: { eyebrow: string; children: ReactNode }) {
  return (
    <aside className="relative hidden overflow-hidden bg-banner p-12 text-white lg:flex lg:flex-col lg:justify-between" aria-label="About the newsroom">
      <div aria-hidden="true" className="pointer-events-none absolute -right-24 -top-24 size-[420px] rounded-full bg-brand/30 blur-3xl" />
      <div aria-hidden="true" className="pointer-events-none absolute -bottom-32 -left-20 size-[360px] rounded-full bg-brand/15 blur-3xl" />
      <p className="relative text-[13px] font-medium uppercase tracking-widest text-white/60">{eyebrow}</p>
      <div className="relative max-w-[440px]">{children}</div>
      <p className="relative text-[12px] text-white/50">For newsroom staff.</p>
    </aside>
  );
}

export function SignInAside() {
  return (
    <Shell eyebrow="The newsroom in your pocket">
      <p className="font-serif text-[34px] font-semibold leading-[1.2] text-balance">From the spot to the front page in minutes.</p>
      <ul className="mt-9 space-y-5 text-[15px]">
        {SIGNIN_POINTS.map(({ icon: Icon, title, text }) => (
          <li key={title} className="flex gap-3.5">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Icon className="size-[18px]" aria-hidden="true" />
            </span>
            <span>
              <span className="block font-semibold">{title}</span>
              <span className="block text-white/70">{text}</span>
            </span>
          </li>
        ))}
      </ul>
    </Shell>
  );
}

export function SignUpAside({ name, title, email }: { name: string; title: string; email: string }) {
  const display = name.trim() || "Your name";
  return (
    <Shell eyebrow="Joining the newsroom">
      <p className="text-[13px] font-medium text-white/60">Your staff card</p>
      <div className="mt-3 rounded-2xl bg-white p-5 text-ink shadow-2xl shadow-black/30">
        <div className="flex items-center gap-3.5">
          <span className="flex size-12 shrink-0 items-center justify-center rounded-full bg-brand-soft text-[16px] font-semibold text-brand-deep" aria-hidden="true">
            {initials(name)}
          </span>
          <div className="min-w-0">
            <p className={name.trim() ? "truncate text-[16px] font-semibold" : "truncate text-[16px] font-semibold text-faint"}>{display}</p>
            <p className="truncate text-[13px] text-muted">{title.trim() || "Reporter"}</p>
          </div>
          <span className="ml-auto shrink-0 rounded-full bg-brand-soft px-2.5 py-0.5 text-[12px] font-medium text-brand-deep">Reporter</span>
        </div>
        <dl className="mt-4 grid grid-cols-2 gap-3 border-t border-line pt-4 text-[12px]">
          <div className="min-w-0">
            <dt className="text-muted">Email</dt>
            <dd className="truncate font-medium">{email.trim() || "you@newsapp.example"}</dd>
          </div>
          <div>
            <dt className="text-muted">Publishing</dt>
            <dd className="font-medium">Editor review</dd>
          </div>
        </dl>
      </div>

      <ol className="mt-9 space-y-5 text-[15px]">
        {SIGNUP_STEPS.map(({ icon: Icon, title: t, text }, i) => (
          <li key={t} className="flex gap-3.5">
            <span className="relative flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/10">
              <Icon className="size-[18px]" aria-hidden="true" />
              <span className="absolute -right-1.5 -top-1.5 flex size-4 items-center justify-center rounded-full bg-brand text-[10px] font-semibold" aria-hidden="true">
                {i + 1}
              </span>
            </span>
            <span>
              <span className="block font-semibold">{t}</span>
              <span className="block text-white/70">{text}</span>
            </span>
          </li>
        ))}
      </ol>
    </Shell>
  );
}
