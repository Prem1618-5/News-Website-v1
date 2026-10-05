import { useEffect, useState } from "react";
import { Link, Navigate, useNavigate, useSearchParams } from "react-router-dom";
import { ChevronRight, List, Network, Plus, ShieldCheck } from "lucide-react";
import { ModePill } from "@/components/ui/badges";
import { Avatar, Button, EmptyState, Field, Modal, PageHeader, Pill, Segmented, Tabs, inputCls } from "@/components/ui/primitives";
import { CAPABILITY_LABEL, ROLE_GRANTS, ROLE_LABEL } from "@/domain/capabilities";
import { improvementSignal } from "@/domain/supervision";
import type { Role, Staff } from "@/domain/types";
import { effectiveMode, getStaff, inviteStaff } from "@/domain/workflow";
import { useNewsroom } from "@/state/store";

type Tab = "all" | "supervised" | "ready";

export default function Team() {
  const { state, actor, can } = useNewsroom();
  const [params, setParams] = useSearchParams();
  const [tab, setTab] = useState<Tab>(params.get("tab") === "supervised" ? "supervised" : "all");
  const [layout, setLayout] = useState<"list" | "org">("list");
  const [rolesOpen, setRolesOpen] = useState(false);
  const [inviteOpen, setInviteOpen] = useState(params.get("invite") === "1");

  useEffect(() => {
    if (params.get("tab") === "supervised") setTab("supervised");
    if (params.get("invite") === "1") setInviteOpen(true);
  }, [params]);

  if (!can("team.view")) return <Navigate to="/" replace />;

  const people = state.staff.filter((s) => (actor.role === "admin" ? true : s.role === "reporter" && s.editorId === actor.id));
  const ready = people.filter((s) => s.supervision === "supervised" && improvementSignal(state.outcomes, s, Date.now()).ready);
  const rows = people.filter((s) => (tab === "supervised" ? s.supervision === "supervised" : tab === "ready" ? ready.includes(s) : true));

  return (
    <>
      <PageHeader title={actor.role === "admin" ? "Team" : "My reporters"} subtitle={actor.role === "editor" ? "You can manage modes and supervision for reporters assigned to you." : undefined}>
        <Button onClick={() => setRolesOpen(true)}>
          <ShieldCheck className="size-4" /> Roles
        </Button>
        {can("team.manage") && (
          <Button variant="primary" onClick={() => setInviteOpen(true)}>
            <Plus className="size-4" /> Invite
          </Button>
        )}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Tabs
          label="Team views"
          value={tab}
          onChange={(t) => {
            setTab(t);
            setParams(t === "all" ? {} : { tab: t });
          }}
          items={[
            { id: "all", label: "All", count: people.length },
            { id: "supervised", label: "Supervised", count: people.filter((p) => p.supervision === "supervised").length },
            { id: "ready", label: "Ready for review", count: ready.length },
          ]}
        />
        {actor.role === "admin" && (
          <Segmented
            label="Layout"
            value={layout}
            onChange={setLayout}
            items={[
              { id: "list", label: "List", icon: <List className="size-4" /> },
              { id: "org", label: "Org chart", icon: <Network className="size-4" /> },
            ]}
          />
        )}
      </div>

      {layout === "org" && actor.role === "admin" ? (
        <OrgChart />
      ) : rows.length === 0 ? (
        <EmptyState title="No one here" body={tab === "ready" ? "When a supervised reporter shows a sustained improvement, they appear here for you to decide." : undefined} />
      ) : (
        <div role="table" aria-label="Team members">
          <div role="row" className="hidden grid-cols-[minmax(0,1.4fr)_100px_150px_130px_100px] gap-4 border-b border-line px-2 pb-2 text-[12px] font-medium text-muted md:grid">
            <span role="columnheader">Name</span>
            <span role="columnheader">Role</span>
            <span role="columnheader">Assigned editor</span>
            <span role="columnheader">Mode</span>
            <span role="columnheader">Status</span>
          </div>
          {rows.map((p) => (
            <PersonRow key={p.id} p={p} />
          ))}
        </div>
      )}

      {rolesOpen && <RolesModal onClose={() => setRolesOpen(false)} />}
      {inviteOpen && (
        <InviteModal
          onClose={() => {
            setInviteOpen(false);
            if (params.get("invite")) setParams({});
          }}
        />
      )}
    </>
  );
}

function PersonRow({ p }: { p: Staff }) {
  const { state } = useNewsroom();
  const navigate = useNavigate();
  const editor = p.editorId ? getStaff(state, p.editorId) : undefined;
  return (
    <div role="row" className="border-b border-line">
      <button
        onClick={() => p.role === "reporter" && navigate(`/team/${p.id}`)}
        className="grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-1 px-2 py-3 text-left hover:bg-wash md:grid-cols-[minmax(0,1.4fr)_100px_150px_130px_100px]"
      >
        <span role="cell" className="flex min-w-0 items-center gap-3">
          <Avatar person={p} size={32} />
          <span className="min-w-0 leading-tight">
            <span className="block truncate text-[14px] font-medium">{p.name}</span>
            <span className="block truncate text-[12px] text-muted">{p.email}</span>
          </span>
        </span>
        <span role="cell" className="hidden text-[14px] md:block">{ROLE_LABEL[p.role]}</span>
        <span role="cell" className="hidden truncate text-[14px] md:block">{editor?.name ?? "-"}</span>
        <span role="cell" className="flex items-center justify-end gap-1.5 md:justify-start">
          {p.role === "reporter" ? <ModePill mode={effectiveMode(p)} /> : <Pill>{p.publishMode === "auto" ? "Auto" : "Review"}</Pill>}
        </span>
        <span role="cell" className="hidden md:block">
          <Pill tone={p.status === "active" ? "good" : p.status === "invited" ? "brand" : "warn"}>{p.status[0].toUpperCase() + p.status.slice(1)}</Pill>
        </span>
      </button>
    </div>
  );
}

function OrgChart() {
  const { state } = useNewsroom();
  const admins = state.staff.filter((s) => s.role === "admin");
  const editors = state.staff.filter((s) => s.role === "editor");
  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-center gap-3">
        {admins.map((a) => (
          <OrgNode key={a.id} p={a} />
        ))}
      </div>
      <div className="mx-auto h-6 w-px bg-line" aria-hidden="true" />
      <div className="grid gap-4 md:grid-cols-3">
        {editors.map((e) => {
          const reporters = state.staff.filter((s) => s.editorId === e.id);
          return (
            <div key={e.id} className="rounded-2xl border border-line p-3">
              <OrgNode p={e} />
              <p className="mb-1 mt-3 px-1 text-[12px] font-medium text-muted">{reporters.length} reporters</p>
              <ul className="space-y-1">
                {reporters.map((r) => (
                  <li key={r.id}>
                    <Link to={`/team/${r.id}`} className="flex items-center gap-2.5 rounded-lg px-1.5 py-1.5 hover:bg-wash">
                      <Avatar person={r} size={24} />
                      <span className="flex-1 truncate text-[13px]">{r.name}</span>
                      <ModePill mode={effectiveMode(r)} />
                      <ChevronRight className="size-4 text-faint" aria-hidden="true" />
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function OrgNode({ p }: { p: Staff }) {
  return (
    <div className="flex items-center gap-3 rounded-xl bg-wash px-3 py-2.5">
      <Avatar person={p} size={36} />
      <div className="leading-tight">
        <p className="text-[14px] font-medium">{p.name}</p>
        <p className="text-[12px] text-muted">
          {ROLE_LABEL[p.role]} · {p.jobTitle}
        </p>
      </div>
    </div>
  );
}

function RolesModal({ onClose }: { onClose: () => void }) {
  return (
    <Modal title="Roles and what they can do" onClose={onClose} footer={<Button onClick={onClose}>Close</Button>}>
      <p className="text-[13px] text-muted">
        Navigation and actions come from this list. The server checks it on every request; hiding a button is never the security.
      </p>
      {(["admin", "editor", "reporter"] as Role[]).map((r) => (
        <section key={r}>
          <h3 className="mb-1.5 text-[14px] font-semibold">
            {ROLE_LABEL[r]} <span className="font-normal text-muted">· rank {{ reporter: 1, editor: 2, admin: 3 }[r]}</span>
          </h3>
          <ul className="space-y-1 text-[13px]">
            {Object.entries(ROLE_GRANTS[r]).map(([cap, scope]) => (
              <li key={cap} className="flex justify-between gap-3">
                <span>{CAPABILITY_LABEL[cap as keyof typeof CAPABILITY_LABEL]}</span>
                <span className="text-muted">{scope}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </Modal>
  );
}

function InviteModal({ onClose }: { onClose: () => void }) {
  const { state, run } = useNewsroom();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"reporter" | "editor">("reporter");
  const [editorId, setEditorId] = useState(state.staff.find((s) => s.role === "editor")?.id ?? "");
  return (
    <Modal
      title="Invite staff"
      onClose={onClose}
      footer={
        <>
          <Button onClick={onClose}>Cancel</Button>
          <Button
            variant="primary"
            onClick={() => {
              if (run((s, a) => inviteStaff(s, a, { name, email, role, editorId: role === "reporter" ? editorId : undefined }))) onClose();
            }}
          >
            Send invite
          </Button>
        </>
      }
    >
      <p className="text-[13px] text-muted">There is no public staff sign-up. Invites are one-time links that expire in 72 hours. The invitee sets a password and enrols TOTP.</p>
      <Field label="Full name">
        <input className={inputCls} value={name} onChange={(e) => setName(e.target.value)} />
      </Field>
      <Field label="Work email">
        <input className={inputCls} type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
      </Field>
      <Field label="Role">
        <select className={inputCls} value={role} onChange={(e) => setRole(e.target.value as "reporter" | "editor")}>
          <option value="reporter">Reporter</option>
          <option value="editor">Editor</option>
        </select>
      </Field>
      {role === "reporter" && (
        <Field label="Assigned editor" hint="Every reporter has exactly one. New reporters start in review mode.">
          <select className={inputCls} value={editorId} onChange={(e) => setEditorId(e.target.value)}>
            {state.staff.filter((s) => s.role === "editor").map((e) => (
              <option key={e.id} value={e.id}>
                {e.name}
              </option>
            ))}
          </select>
        </Field>
      )}
    </Modal>
  );
}
