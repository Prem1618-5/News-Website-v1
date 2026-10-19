/** Opened from an invite or password-reset link: choose a password and sign straight in. */
import { useState, type FormEvent } from "react";
import { AlertCircle, Loader2 } from "lucide-react";
import useSWR from "swr";
import { checkLink, choosePassword, type Session } from "@/api/staffAuth";
import { errorText } from "@/api/http";
import { ROLE_LABEL } from "@/domain/types";
import { AuthField } from "./AuthField";
import { MIN_PASSWORD, PasswordStrength } from "./PasswordStrength";

export default function LinkPage({ token, onAuthenticated, onCancel }: { token: string; onAuthenticated: (s: Session) => void; onCancel: () => void }) {
  const { data, error: linkError } = useSWR(["staff-link", token], () => checkLink(token), { revalidateOnFocus: false, shouldRetryOnError: false });
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (password.length < MIN_PASSWORD) return setError(`Use at least ${MIN_PASSWORD} characters.`);
    if (password !== confirm) return setError("The two passwords are different.");
    setBusy(true);
    setError(null);
    try {
      const r = await choosePassword(token, password);
      if (r.kind === "session") onAuthenticated(r);
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="flex min-h-dvh items-center justify-center px-5 py-10">
      <div className="w-full max-w-[400px]">
        <div className="mb-8 flex items-center gap-2.5">
          <span className="flex size-9 items-center justify-center rounded-lg bg-brand font-serif text-[18px] font-semibold text-white" aria-hidden="true">N</span>
          <span className="text-[15px] font-semibold">News APP Newsroom</span>
        </div>
        {linkError ? (
          <>
            <h1 className="font-serif text-[24px] font-semibold">This link no longer works</h1>
            <p className="mt-2 text-[14px] text-muted">{errorText(linkError)} Ask your editor for a new link, or use “Forgot password” on the sign-in page.</p>
            <button type="button" onClick={onCancel} className="mt-6 h-11 w-full rounded-lg bg-brand text-[15px] font-semibold text-white">Go to sign in</button>
          </>
        ) : !data ? (
          <p role="status" className="flex items-center gap-2 text-[14px] text-muted"><Loader2 className="size-4 animate-spin" aria-hidden="true" /> Checking your link</p>
        ) : (
          <>
            <h1 className="font-serif text-[26px] font-semibold leading-tight">{data.purpose === "invite" ? `Welcome, ${data.name.split(" ")[0]}` : "Choose a new password"}</h1>
            <p className="mt-1.5 text-[14px] text-muted">
              {data.purpose === "invite" ? `You're joining as ${ROLE_LABEL[data.role].toLowerCase()}. Choose a password to finish.` : `For ${data.email}.`}
            </p>
            <form onSubmit={submit} className="mt-6 space-y-4" noValidate>
              <input type="email" autoComplete="username" value={data.email} readOnly hidden />
              <AuthField id="new-password" label="Password" type="password" revealable value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" maxLength={128}>
                <PasswordStrength id="new-password-strength" password={password} avoid={[data.name, data.email]} />
              </AuthField>
              <AuthField id="confirm-password" label="Type it again" type="password" value={confirm} onChange={(e) => setConfirm(e.target.value)} autoComplete="new-password" maxLength={128} />
              {error && (
                <p role="alert" className="flex items-start gap-2 rounded-lg bg-bad-soft px-3 py-2.5 text-[14px] text-bad">
                  <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" /> {error}
                </p>
              )}
              <button type="submit" disabled={busy} className="flex h-11 w-full items-center justify-center gap-2 rounded-lg bg-brand text-[15px] font-semibold text-white hover:bg-brand-deep disabled:opacity-70">
                {busy && <Loader2 className="size-4 animate-spin" aria-hidden="true" />}
                {data.purpose === "invite" ? "Start writing" : "Save and sign in"}
              </button>
            </form>
          </>
        )}
      </div>
    </main>
  );
}
