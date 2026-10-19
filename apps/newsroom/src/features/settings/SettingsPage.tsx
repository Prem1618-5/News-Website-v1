import { useState } from "react";
import { LogOut } from "lucide-react";
import { updateProfile } from "@/api/desk";
import { errorText, tokenStore } from "@/api/http";
import { changePassword, signOutEverywhere } from "@/api/staffAuth";
import { STATES, districtsOf } from "@/domain/places";
import { ROLE_LABEL, type Lang } from "@/domain/types";
import { useSession } from "@/state/session";
import { Button, Card, CardTitle, Field, PageHeader, Segmented, Spinner, inputCls, selectCls } from "@/components/ui/primitives";
import { InstallPrompt } from "@/pwa/InstallPrompt";
import { PasswordStrength, MIN_PASSWORD } from "@/features/auth/PasswordStrength";

export default function SettingsPage() {
  const { me, refresh, toast, signOut } = useSession();
  const [name, setName] = useState(me.name);
  const [title, setTitle] = useState(me.jobTitle);
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [busy, setBusy] = useState(false);

  const save = async (patch: Parameters<typeof updateProfile>[0], done = "Saved.") => {
    try {
      await updateProfile(patch);
      refresh();
      toast(done, "success");
    } catch (err) {
      toast(errorText(err), "error");
    }
  };

  return (
    <div className="space-y-5">
      <PageHeader title="Settings" subtitle={`${ROLE_LABEL[me.role]} · ${me.email ?? ""}`} />
      <Card className="p-4 sm:p-5">
        <CardTitle>You</CardTitle>
        <form className="grid gap-4 sm:grid-cols-2" onSubmit={(e) => (e.preventDefault(), void save({ display_name: name, job_title: title }))}>
          <Field label="Name (your byline)">
            <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} maxLength={80} />
          </Field>
          <Field label="Job title">
            <input className={inputCls} value={title} onChange={(e) => setTitle(e.target.value)} maxLength={80} />
          </Field>
          <div className="sm:col-span-2">
            <Button type="submit" disabled={name.trim().length < 2 || (name === me.name && title === me.jobTitle)}>Save</Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <CardTitle>Where you report from</CardTitle>
        <p className="mb-3 text-[13px] text-muted">New stories start with this place, so publishing a local story is one tap.</p>
        <div className="grid grid-cols-2 gap-3">
          <select aria-label="State" className={selectCls} value={me.homeState} onChange={(e) => void save({ home_state: e.target.value }, "Place saved.")}>
            <option value="">Choose a state</option>
            {STATES.map((s) => (
              <option key={s.code} value={s.code}>{s.en}</option>
            ))}
          </select>
          <select aria-label="District" className={selectCls} value={me.homeDistrict} disabled={!districtsOf(me.homeState).length} onChange={(e) => void save({ home_district: e.target.value }, "Place saved.")}>
            <option value="">{districtsOf(me.homeState).length ? "Choose a district" : "Not listed"}</option>
            {districtsOf(me.homeState).map((d) => (
              <option key={d.key} value={d.key}>{d.city ? `${d.en} (${d.city})` : d.en}</option>
            ))}
          </select>
        </div>
        <div className="mt-4">
          <p className="mb-1.5 text-[13px] font-medium">I usually write in</p>
          <Segmented<Lang> label="Writing language" value={me.writingLanguage} onChange={(v) => void save({ writing_language: v }, "Saved.")} items={[{ id: "en", label: "English" }, { id: "hi", label: "हिन्दी" }]} />
        </div>
      </Card>

      <Card className="p-4 sm:p-5">
        <CardTitle>Password</CardTitle>
        <form
          className="grid max-w-md gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            setBusy(true);
            try {
              const r = await changePassword(current, next);
              if (r.kind === "session") tokenStore.set(r.token);
              setCurrent("");
              setNext("");
              toast("Password changed. Other devices are signed out.", "success");
            } catch (err) {
              toast(errorText(err), "error");
            } finally {
              setBusy(false);
            }
          }}
        >
          <Field label="Current password">
            <input className={inputCls} type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="New password">
            <input className={inputCls} type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
          <PasswordStrength id="pw-strength" password={next} avoid={[me.name, me.email ?? ""]} />
          <div>
            <Button type="submit" variant="primary" disabled={!current || next.length < MIN_PASSWORD || busy}>
              {busy && <Spinner />} Change password
            </Button>
          </div>
        </form>
      </Card>

      <Card className="p-4 sm:p-5">
        <CardTitle>This device</CardTitle>
        <div className="flex flex-wrap items-center gap-3">
          <InstallPrompt variant="settings" />
          <Button onClick={signOut}>
            <LogOut className="size-4" aria-hidden="true" /> Sign out
          </Button>
          <Button
            variant="danger"
            onClick={async () => {
              if (!window.confirm("Sign out on every phone and computer?")) return;
              try {
                await signOutEverywhere();
              } finally {
                signOut();
              }
            }}
          >
            Sign out everywhere
          </Button>
        </div>
      </Card>
    </div>
  );
}
