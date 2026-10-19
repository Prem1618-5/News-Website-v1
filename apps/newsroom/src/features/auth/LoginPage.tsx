import { useId, useState, type FormEvent } from "react";
import { AlertCircle, ArrowLeft, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";
import useSWR from "swr";
import { fetchAuthConfig, requestReset, signIn, signUp, type DemoAccount, type Session } from "@/api/staffAuth";
import { ApiError, errorText } from "@/api/http";
import { ROLE_LABEL } from "@/domain/types";
import { AuthField } from "./AuthField";
import { MIN_PASSWORD, PasswordStrength } from "./PasswordStrength";
import { SignInAside, SignUpAside } from "./AuthAside";

type Mode = "signin" | "signup" | "forgot";
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;

export default function LoginPage({ onAuthenticated }: { onAuthenticated: (s: Session) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [notice, setNotice] = useState<{ text: string; link?: string } | null>(null);
  const { data: config } = useSWR("staff-auth-config", fetchAuthConfig, { revalidateOnFocus: false, shouldRetryOnError: false });
  const uid = useId();
  const id = (f: string) => `${uid}-${f}`;

  const go = (m: Mode) => {
    setMode(m);
    setError(null);
    setFieldErrors({});
    setNotice(null);
    setPassword("");
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (mode === "signup" && name.trim().length < 2) e.display_name = "Enter your full name.";
    if (!EMAIL.test(email.trim())) e.email = "Enter a valid email address.";
    if (mode !== "forgot" && !password) e.password = "Enter your password.";
    else if (mode === "signup" && password.length < MIN_PASSWORD) e.password = `Use at least ${MIN_PASSWORD} characters.`;
    return e;
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    const errors = validate();
    setFieldErrors(errors);
    setError(null);
    if (Object.keys(errors).length) return;
    setBusy(true);
    try {
      if (mode === "forgot") {
        const r = await requestReset(email.trim());
        setNotice({ text: r.message, link: r.dev_link });
      } else if (mode === "signup") {
        const r = await signUp({ display_name: name.trim(), email: email.trim(), password, job_title: title.trim() });
        if (r.kind === "session") onAuthenticated(r);
        else {
          go("signin");
          setNotice({ text: r.message });
        }
      } else {
        const r = await signIn(email.trim(), password, remember);
        if (r.kind === "session") onAuthenticated(r);
      }
    } catch (err) {
      if (err instanceof ApiError && Object.keys(err.fields).length) setFieldErrors(err.fields);
      if (err instanceof ApiError && err.status === 409) setFieldErrors({ email: err.message });
      else setError(errorText(err));
    } finally {
      setBusy(false);
    }
  }

  const fill = (a: DemoAccount) => {
    go("signin");
    setEmail(a.email);
    setPassword(a.password);
  };

  const heading = mode === "signup" ? "Ask to join the newsroom" : mode === "forgot" ? "Forgot your password?" : "Sign in to the Newsroom";
  const sub =
    mode === "signup"
      ? "The managing editor approves new people. If your editor already added you, use the invite link they sent instead."
      : mode === "forgot"
        ? "Enter your email and we will send a link to choose a new password."
        : "Write, review and publish stories.";

  return (
    <div className="grid min-h-dvh lg:grid-cols-[1fr_minmax(420px,520px)]">
      <main className="flex items-center justify-center px-5 py-10 sm:px-8">
        <div className="w-full max-w-[400px]">
          <div className="mb-8 flex items-center gap-2.5">
            <span className="flex size-9 items-center justify-center rounded-lg bg-brand font-serif text-[18px] font-semibold text-white" aria-hidden="true">N</span>
            <span className="text-[15px] font-semibold">News APP Newsroom</span>
          </div>
          {mode !== "signin" && (
            <button type="button" onClick={() => go("signin")} className="mb-4 inline-flex items-center gap-1 text-[13px] text-muted hover:text-ink">
              <ArrowLeft className="size-4" aria-hidden="true" /> Back to sign in
            </button>
          )}
          <h1 className="font-serif text-[26px] font-semibold leading-tight">{heading}</h1>
          <p className="mt-1.5 text-[14px] text-muted">{sub}</p>

          {notice && (
            <div role="status" className="mt-5 flex items-start gap-2 rounded-lg bg-good-soft px-3 py-2.5 text-[14px] text-good">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              <span>
                {notice.text}
                {notice.link && (
                  <>
                    {" "}
                    <a href={notice.link} className="font-semibold underline">Open the reset link</a> (shown because email is not set up on this server).
                  </>
                )}
              </span>
            </div>
          )}

          <form onSubmit={submit} noValidate className="mt-6 space-y-4">
            {mode === "signup" && (
              <>
                <AuthField id={id("name")} label="Full name" value={name} onChange={(e) => setName(e.target.value)} autoComplete="name" maxLength={80} error={fieldErrors.display_name} />
                <AuthField id={id("title")} label="What you do" optional value={title} onChange={(e) => setTitle(e.target.value)} placeholder="City reporter, Dhanbad" maxLength={80} error={fieldErrors.job_title} />
              </>
            )}
            <AuthField
              id={id("email")}
              label="Email"
              type="email"
              inputMode="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              autoComplete={mode === "signup" ? "email" : "username"}
              spellCheck={false}
              maxLength={254}
              error={fieldErrors.email}
            />
            {mode !== "forgot" && (
              <AuthField
                id={id("password")}
                label="Password"
                type="password"
                revealable
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                maxLength={128}
                error={fieldErrors.password}
              >
                {mode === "signup" && <PasswordStrength id={id("strength")} password={password} avoid={[name, email]} />}
              </AuthField>
            )}
            {mode === "signin" && (
              <div className="flex items-center justify-between text-[13px]">
                <label className="flex items-center gap-2">
                  <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} className="size-4 accent-[var(--color-brand)]" />
                  Keep me signed in
                </label>
                <button type="button" onClick={() => go("forgot")} className="font-medium text-brand hover:underline">
                  Forgot password?
                </button>
              </div>
            )}
            {mode === "signup" && (
              <p className="flex items-start gap-2 rounded-lg bg-wash px-3 py-2.5 text-[13px] text-muted">
                <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                You join as a reporter. You can sign in after approval.
              </p>
            )}
            {error && (
              <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2.5 text-[14px] text-bad">
                <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                {error}
              </p>
            )}
            <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white hover:bg-brand-deep disabled:opacity-70">
              {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
              {mode === "signup" ? "Send request" : mode === "forgot" ? "Email me a reset link" : "Sign in"}
              {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
            </button>
          </form>

          {mode === "signin" && (
            <p className="mt-5 text-center text-[13px] text-muted">
              New here?{" "}
              <button type="button" onClick={() => go("signup")} className="font-medium text-brand hover:underline">Ask to join</button>
            </p>
          )}

          {config && config.demo_accounts.length > 0 && mode === "signin" && (
            <section aria-labelledby={id("demo")} className="mt-7 rounded-xl border border-line bg-wash p-3.5">
              <h2 id={id("demo")} className="text-[13px] font-semibold">Local development accounts</h2>
              <p className="mt-0.5 text-[12px] text-muted">Only on a development server. Tap one to fill the form.</p>
              <ul className="mt-2.5 grid gap-1.5">
                {config.demo_accounts.map((a) => (
                  <li key={a.email}>
                    <button type="button" onClick={() => fill(a)} className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left text-[13px] hover:border-brand/50">
                      <span className="min-w-0">
                        <span className="block truncate font-medium">{a.name}</span>
                        <span className="block truncate text-[12px] text-muted">{a.email}</span>
                      </span>
                      <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[12px] font-medium text-brand-deep">{ROLE_LABEL[a.role]}</span>
                    </button>
                  </li>
                ))}
              </ul>
            </section>
          )}
        </div>
      </main>
      {mode === "signup" ? <SignUpAside name={name} title={title} email={email} /> : <SignInAside />}
    </div>
  );
}
