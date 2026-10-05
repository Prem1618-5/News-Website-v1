import { useId, useRef, useState, type FormEvent } from "react";
import { AlertCircle, ArrowRight, CheckCircle2, Info, Loader2 } from "lucide-react";
import clsx from "clsx";
import useSWR from "swr";
import { AuthError, fetchAuthConfig, signIn, signUp, type AuthField as FieldName, type AuthResult, type DemoAccount } from "@/api/staffAuth";
import { ROLE_LABEL } from "@/domain/capabilities";
import { AuthField } from "./AuthField";
import { MIN_PASSWORD, PasswordStrength } from "./PasswordStrength";
import { SignInAside, SignUpAside } from "./AuthAside";

type Mode = "signin" | "signup";
type FieldErrors = Partial<Record<FieldName, string>>;

const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/;
const FIELD_ORDER: FieldName[] = ["display_name", "job_title", "email", "password"];

function validate(mode: Mode, v: { name: string; email: string; password: string }): FieldErrors {
  const errors: FieldErrors = {};
  if (mode === "signup" && v.name.trim().length < 2) errors.display_name = "Enter your full name (at least 2 characters).";
  if (!v.email.trim()) errors.email = "Enter your work email.";
  else if (!EMAIL.test(v.email.trim())) errors.email = "Enter a valid email address, like name@newsapp.example.";
  if (!v.password) errors.password = "Enter your password.";
  else if (mode === "signup" && v.password.length < MIN_PASSWORD) errors.password = `Use at least ${MIN_PASSWORD} characters.`;
  return errors;
}

export default function LoginPage({ onAuthenticated }: { onAuthenticated: (r: Extract<AuthResult, { kind: "session" }>) => void }) {
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [title, setTitle] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<FieldErrors>({});
  const [notice, setNotice] = useState<string | null>(null);
  const { data: config } = useSWR("staff-auth-config", fetchAuthConfig, { revalidateOnFocus: false, shouldRetryOnError: false });
  const uid = useId();
  const formRef = useRef<HTMLFormElement>(null);

  const signup = mode === "signup";
  const id = (f: string) => `${uid}-${f}`;

  const resetFeedback = () => {
    setError(null);
    setFieldErrors({});
    setNotice(null);
  };

  const switchMode = (m: Mode) => {
    if (m === mode) return;
    setMode(m);
    setPassword("");
    resetFeedback();
  };

  const edit = (field: FieldName, set: (v: string) => void) => (value: string) => {
    set(value);
    setError(null);
    if (fieldErrors[field]) setFieldErrors(({ [field]: _, ...rest }) => rest);
  };

  const fill = (a: DemoAccount) => {
    setMode("signin");
    setEmail(a.email);
    setPassword(a.password);
    resetFeedback();
  };

  const focusFirstError = (errors: FieldErrors) => {
    const first = FIELD_ORDER.find((f) => errors[f]);
    if (first) formRef.current?.querySelector<HTMLInputElement>(`#${CSS.escape(id(first))}`)?.focus();
  };

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (busy) return;
    setError(null);
    setNotice(null);
    const errors = validate(mode, { name, email, password });
    setFieldErrors(errors);
    if (Object.keys(errors).length) {
      focusFirstError(errors);
      return;
    }
    setBusy(true);
    try {
      const result = signup
        ? await signUp({ display_name: name.trim(), email: email.trim(), password, job_title: title.trim() })
        : await signIn(email.trim(), password);
      if (result.kind === "session") {
        onAuthenticated(result);
        return;
      }
      setMode("signin");
      setPassword("");
      setFieldErrors({});
      setNotice(result.message);
    } catch (err) {
      if (err instanceof AuthError) {
        const serverFields = err.fields;
        if (Object.keys(serverFields).length) {
          setFieldErrors(serverFields);
          focusFirstError(serverFields);
        } else if (err.status === 409) {
          setFieldErrors({ email: err.message });
          focusFirstError({ email: err.message });
        } else {
          setError(err.message);
        }
      } else {
        setError("Something went wrong. Try again.");
      }
    } finally {
      setBusy(false);
    }
  }

  const requiresApproval = config?.signup_requires_approval;

  return (
    <div className="grid min-h-dvh bg-white lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]">
      <main className="flex flex-col px-5 py-8 sm:px-10">
        <header className="flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand font-serif text-[19px] font-semibold text-white" aria-hidden="true">
            N
          </span>
          <div className="leading-tight">
            <p className="text-[15px] font-semibold">News APP</p>
            <p className="text-[12px] text-muted">Newsroom</p>
          </div>
        </header>

        <div className="mx-auto flex w-full max-w-[420px] flex-1 flex-col justify-center py-10">
          <h1 className="font-serif text-[30px] font-semibold leading-tight text-balance">{signup ? "Join the newsroom" : "Sign in to the newsroom"}</h1>
          <p className="mt-2 text-[15px] text-pretty text-muted">
            {signup ? "Create your staff account to start filing stories. New accounts begin as reporters." : "Use your staff email to open your desk."}
          </p>

          <div role="tablist" aria-label="Account" className="mt-6 grid grid-cols-2 rounded-lg bg-wash p-1 text-[14px] font-medium">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                id={id(`tab-${m}`)}
                role="tab"
                type="button"
                aria-selected={mode === m}
                aria-controls={id("panel")}
                onClick={() => switchMode(m)}
                className={clsx("h-9 rounded-md transition-colors", mode === m ? "bg-white text-ink shadow-sm" : "text-muted hover:text-ink")}
              >
                {m === "signin" ? "Sign in" : "Create account"}
              </button>
            ))}
          </div>

          {notice && (
            <p role="status" className="mt-4 flex items-start gap-2 rounded-lg bg-good-soft px-3 py-2.5 text-[14px] text-good">
              <CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
              {notice}
            </p>
          )}

          <div id={id("panel")} role="tabpanel" aria-labelledby={id(`tab-${mode}`)}>
            <form ref={formRef} onSubmit={submit} noValidate className="mt-5" aria-busy={busy}>
              {signup ? (
                <div className="space-y-6">
                  <fieldset className="space-y-4">
                    <legend className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">About you</legend>
                    <AuthField
                      id={id("display_name")}
                      label="Full name"
                      value={name}
                      onChange={(e) => edit("display_name", setName)(e.target.value)}
                      autoComplete="name"
                      placeholder="Alex Rivera"
                      maxLength={80}
                      required
                      error={fieldErrors.display_name}
                    />
                    <AuthField
                      id={id("job_title")}
                      label="Job title"
                      optional
                      value={title}
                      onChange={(e) => edit("job_title", setTitle)(e.target.value)}
                      autoComplete="organization-title"
                      placeholder="Science reporter"
                      maxLength={80}
                      error={fieldErrors.job_title}
                    />
                  </fieldset>
                  <fieldset className="space-y-4">
                    <legend className="mb-3 text-[12px] font-semibold uppercase tracking-wider text-muted">Sign-in details</legend>
                    <AuthField
                      id={id("email")}
                      label="Work email"
                      type="email"
                      inputMode="email"
                      value={email}
                      onChange={(e) => edit("email", setEmail)(e.target.value)}
                      autoComplete="email"
                      spellCheck={false}
                      placeholder="you@newsapp.example"
                      maxLength={254}
                      required
                      error={fieldErrors.email}
                    />
                    <AuthField
                      id={id("password")}
                      label="Password"
                      type="password"
                      revealable
                      value={password}
                      onChange={(e) => edit("password", setPassword)(e.target.value)}
                      autoComplete="new-password"
                      maxLength={128}
                      required
                      error={fieldErrors.password}
                      aria-describedby={[fieldErrors.password && `${id("password")}-error`, id("strength")].filter(Boolean).join(" ")}
                    >
                      <PasswordStrength id={id("strength")} password={password} avoid={[name, email]} />
                    </AuthField>
                  </fieldset>

                  <div className="flex items-start gap-2.5 rounded-lg border border-line bg-wash px-3.5 py-3 text-[13px] text-muted">
                    <Info className="mt-0.5 size-4 shrink-0 text-brand" aria-hidden="true" />
                    <p>
                      You&apos;ll join as a <span className="font-medium text-ink">Reporter</span>. Your stories go to an editor for review before publishing.
                      {requiresApproval && " The managing editor approves new accounts before your first sign-in."}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <AuthField
                    id={id("email")}
                    label="Work email"
                    type="email"
                    inputMode="email"
                    value={email}
                    onChange={(e) => edit("email", setEmail)(e.target.value)}
                    autoComplete="username"
                    spellCheck={false}
                    placeholder="you@newsapp.example"
                    maxLength={254}
                    required
                    error={fieldErrors.email}
                  />
                  <AuthField
                    id={id("password")}
                    label="Password"
                    type="password"
                    revealable
                    value={password}
                    onChange={(e) => edit("password", setPassword)(e.target.value)}
                    autoComplete="current-password"
                    maxLength={128}
                    required
                    error={fieldErrors.password}
                  />
                </div>
              )}

              {error && (
                <p role="alert" className="mt-4 flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2.5 text-[14px] text-bad">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
                  {error}
                </p>
              )}

              <button
                type="submit"
                disabled={busy}
                className="mt-5 flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white transition-colors hover:bg-brand-deep disabled:cursor-not-allowed disabled:opacity-70"
              >
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {busy ? (signup ? "Creating account…" : "Signing in…") : signup ? "Create account" : "Sign in"}
                {!busy && <ArrowRight className="size-4" aria-hidden="true" />}
              </button>

              <p className="mt-4 text-center text-[13px] text-muted">
                {signup ? "Already have an account? " : "New to the newsroom? "}
                <button type="button" onClick={() => switchMode(signup ? "signin" : "signup")} className="font-medium text-brand hover:text-brand-deep hover:underline">
                  {signup ? "Sign in" : "Create an account"}
                </button>
              </p>
            </form>
          </div>

          {config && config.demo_accounts.length > 0 && !signup && (
            <section aria-labelledby={id("demo")} className="mt-7 rounded-xl border border-line bg-wash p-3.5">
              <h2 id={id("demo")} className="text-[13px] font-semibold">
                Demo accounts
              </h2>
              <p className="mt-0.5 text-[12px] text-muted">Pick one to fill the form. Shared password for all.</p>
              <ul className="mt-2.5 grid gap-1.5">
                {config.demo_accounts.map((a) => (
                  <li key={a.email}>
                    <button
                      type="button"
                      onClick={() => fill(a)}
                      className="flex w-full items-center justify-between gap-3 rounded-lg border border-line bg-white px-3 py-2 text-left text-[13px] hover:border-brand/50"
                    >
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

          <p className="mt-6 text-[13px] text-muted">
            Just looking around?{" "}
            <a href="?demo=1" className="font-medium text-brand hover:text-brand-deep hover:underline">
              Open the demo workspace
            </a>
          </p>
        </div>
      </main>

      {signup ? <SignUpAside name={name} title={title} email={email} /> : <SignInAside />}
    </div>
  );
}
