import { useState } from "react";
import { addPerson, type NewPerson } from "@/api/desk";
import { errorText } from "@/api/http";
import { STATES, districtsOf } from "@/domain/places";
import { ROLE_LABEL, type Role, type Staff } from "@/domain/types";
import { useSession } from "@/state/session";
import { Button, Field, Modal, Spinner, Toggle, inputCls, selectCls } from "@/components/ui/primitives";
import { ShareLink } from "./ShareLink";

export function AddPersonDialog({ editors, onClose, onAdded }: { editors: Staff[]; onClose: () => void; onAdded: () => void }) {
  const { me } = useSession();
  const roles: Role[] = me.role === "admin" ? ["reporter", "editor", "admin"] : ["reporter"];
  const [form, setForm] = useState<NewPerson>({
    name: "", email: "", role: "reporter", job_title: "",
    reports_to: me.role === "editor" ? me.id : "", home_state: me.homeState || "JH", home_district: me.homeDistrict || "", trusted: false,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState<{ person: Staff; link: string; emailed: boolean } | null>(null);
  const set = (p: Partial<NewPerson>) => setForm((f) => ({ ...f, ...p }));
  const districts = districtsOf(form.home_state);

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const r = await addPerson({ ...form, name: form.name.trim(), email: form.email.trim() });
      setDone({ person: r.person, link: r.invite_link, emailed: r.emailed });
      onAdded();
    } catch (err) {
      setError(errorText(err));
    } finally {
      setBusy(false);
    }
  };

  if (done)
    return (
      <Modal title={`${done.person.name} is added`} onClose={onClose} footer={<Button variant="primary" onClick={onClose}>Done</Button>}>
        <p className="text-[14px]">
          {done.emailed ? (
            <>We emailed an invite to <b>{done.person.email}</b>. You can also send them this link:</>
          ) : (
            <>Send them this link. Opening it lets them choose a password and start writing. It works for 3 days.</>
          )}
        </p>
        <ShareLink link={done.link} message={`You're invited to the News APP Newsroom. Set your password here:`} />
      </Modal>
    );

  const valid = form.name.trim().length >= 2 && /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(form.email.trim());
  return (
    <Modal
      title={me.role === "editor" ? "Add a reporter" : "Add a person"}
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button variant="primary" disabled={!valid || busy} onClick={() => void save()}>
            {busy && <Spinner />} Add and get invite link
          </Button>
        </>
      }
    >
      <form onSubmit={(e) => (e.preventDefault(), valid && void save())} className="space-y-4">
        <Field label="Full name">
          <input className={inputCls} value={form.name} onChange={(e) => set({ name: e.target.value })} autoComplete="off" maxLength={80} autoFocus />
        </Field>
        <Field label="Email" hint="They sign in with this. The invite goes here when email is set up.">
          <input className={inputCls} type="email" inputMode="email" value={form.email} onChange={(e) => set({ email: e.target.value })} autoComplete="off" maxLength={254} />
        </Field>
        {roles.length > 1 && (
          <Field label="Role">
            <select className={selectCls} value={form.role} onChange={(e) => set({ role: e.target.value as Role, reports_to: e.target.value === "reporter" ? form.reports_to : "", trusted: false })}>
              {roles.map((r) => (
                <option key={r} value={r}>{ROLE_LABEL[r]}{r === "reporter" ? ": writes stories" : r === "editor" ? ": reviews and publishes, manages reporters" : ": manages everyone"}</option>
              ))}
            </select>
          </Field>
        )}
        {form.role === "reporter" && me.role === "admin" && (
          <Field label="Their editor" hint="Stories go to this editor first. Without one, any editor can review.">
            <select className={selectCls} value={form.reports_to} onChange={(e) => set({ reports_to: e.target.value })}>
              <option value="">No editor yet</option>
              {editors.map((e) => (
                <option key={e.id} value={e.id}>{e.name}</option>
              ))}
            </select>
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="State">
            <select className={selectCls} value={form.home_state} onChange={(e) => set({ home_state: e.target.value, home_district: "" })}>
              {STATES.map((s) => (
                <option key={s.code} value={s.code}>{s.en}</option>
              ))}
            </select>
          </Field>
          <Field label="District">
            <select className={selectCls} value={form.home_district} onChange={(e) => set({ home_district: e.target.value })} disabled={!districts.length}>
              <option value="">{districts.length ? "Choose" : "Not listed"}</option>
              {districts.map((d) => (
                <option key={d.key} value={d.key}>{d.en}</option>
              ))}
            </select>
          </Field>
        </div>
        {form.role === "reporter" && (
          <label className="flex items-start justify-between gap-3 rounded-xl border border-line px-3 py-2.5">
            <span className="text-[13.5px]">
              <span className="block font-medium">Trusted</span>
              <span className="block text-muted">Publishes without waiting for review. You read it afterwards.</span>
            </span>
            <Toggle label="Trusted" checked={!!form.trusted} onChange={(v) => set({ trusted: v })} />
          </label>
        )}
        {error && <p role="alert" className="rounded-lg bg-bad-soft px-3 py-2 text-[13.5px] text-bad">{error}</p>}
        <button type="submit" hidden />
      </form>
    </Modal>
  );
}
