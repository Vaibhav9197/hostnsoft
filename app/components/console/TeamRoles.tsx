"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Alert, LinkButton, NativeSelect, Panel, PanelTitle, Skeleton, Tag } from "./kit";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { membersApi, projectsApi } from "../../lib/hnsApi";
import { ROLE_HINTS, ROLE_LABELS, usePermissions } from "../../lib/permissions";
import { useSession } from "../../lib/session";
import type { AppGrant, AppScope, Member, MembersList, PendingInvite, Project, WorkspaceRole } from "../../lib/types";

// What each person in the workspace can do — the half of the members page
// that's ours. Adding and removing people (and the invite email) is the
// members embed below this, which is MSG91's; roles are kept by hostnsoft-api
// and checked there on every request. So this panel only ever changes roles
// and app access, and an invite here only remembers the role: the person is
// then invited from the embed, and gets that role the first time they arrive.

const ROLES: WorkspaceRole[] = ["owner", "admin", "developer", "viewer", "billing"];
const LIMITED: ReadonlySet<WorkspaceRole> = new Set(["developer", "viewer"]);
const OWNERISH: ReadonlySet<WorkspaceRole> = new Set(["owner", "admin"]);

type Draft = {
  role: WorkspaceRole;
  appScope: AppScope;
  canCreate: boolean;
  canDelete: boolean;
  apps: Record<string, AppGrant["level"]>;
};

function draftOf(m: Pick<Member, "role" | "appScope" | "canCreate" | "canDelete" | "apps">): Draft {
  return {
    role: m.role,
    appScope: m.appScope,
    canCreate: m.canCreate,
    canDelete: m.canDelete,
    apps: Object.fromEntries(m.apps.map((a) => [a.projectId, a.level])),
  };
}

function accessSummary(m: Pick<Member, "role" | "appScope" | "apps">): string | null {
  if (!LIMITED.has(m.role)) return null;
  if (m.appScope === "all") return "All apps";
  return m.apps.length === 1 ? "1 app" : `${m.apps.length} apps`;
}

export function TeamRoles() {
  const { activeCompanyId } = useSession();
  const { can, role: myRole, reload: reloadMine } = usePermissions();
  const [list, setList] = useState<MembersList | null>(null);
  const [apps, setApps] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);

  const canManage = can("members.manage");
  const isOwner = myRole === "owner";

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setError(null);
    try {
      const [members, projects] = await Promise.all([
        membersApi.list(activeCompanyId),
        projectsApi.list(activeCompanyId).catch(() => [] as Project[]),
      ]);
      setList(members);
      setApps(projects);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load your team.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  // Owners and Admins are an Owner's to change; the API says so too.
  const mayEdit = (m: Pick<Member, "role">) => canManage && (isOwner || !OWNERISH.has(m.role));

  async function cancelInvite(invite: PendingInvite) {
    if (!activeCompanyId) return;
    try {
      await membersApi.cancelInvite(activeCompanyId, invite.id);
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t cancel that invite.");
    }
  }

  return (
    <Panel padded>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <PanelTitle>What each person can do</PanelTitle>
        {canManage && (
          <Button variant="outline" size="sm" onClick={() => setInviting(true)}>
            Invite with a role
          </Button>
        )}
      </div>

      {error && <Alert className="mt-3">{error}</Alert>}

      {!list ? (
        <Skeleton className="mt-4 h-28" aria-hidden="true" />
      ) : (
        <>
          {!list.complete && (
            <Alert variant="note" className="mt-3">
              Some people may be missing from this list.
            </Alert>
          )}
          <ul className="mt-3 divide-y divide-border">
            {list.members.map((m) => (
              <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                <div className="min-w-0">
                  <p className="truncate text-[0.95rem] font-semibold text-foreground">
                    {m.name || m.email || "Someone"}
                    {m.isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
                  </p>
                  {m.name && m.email && <p className="truncate text-sm text-muted-foreground">{m.email}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-sm text-foreground">{ROLE_LABELS[m.role]}</span>
                  {accessSummary(m) && <Tag>{accessSummary(m)}</Tag>}
                  {mayEdit(m) && <LinkButton onClick={() => setEditing(m)}>Change</LinkButton>}
                </div>
              </li>
            ))}
          </ul>

          {list.invites.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-foreground">Waiting to join</p>
              <ul className="mt-1 divide-y divide-border">
                {list.invites.map((i) => (
                  <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                    <span className="truncate text-sm text-foreground">{i.email}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-sm text-muted-foreground">{ROLE_LABELS[i.role]}</span>
                      {canManage && (isOwner || !OWNERISH.has(i.role)) && (
                        <LinkButton onClick={() => cancelInvite(i)}>Cancel</LinkButton>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            </>
          )}
        </>
      )}

      <AccessDialog
        member={editing}
        apps={apps}
        roles={isOwner ? ROLES : ROLES.filter((r) => !OWNERISH.has(r))}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await Promise.all([load(), reloadMine()]);
        }}
      />
      <InviteDialog
        open={inviting}
        apps={apps}
        roles={isOwner ? ROLES : ROLES.filter((r) => !OWNERISH.has(r))}
        onClose={() => setInviting(false)}
        onSaved={async () => {
          setInviting(false);
          await load();
        }}
      />
    </Panel>
  );
}

// Role, and for a Developer or Viewer which apps and how far. Shared by the
// change dialog and the invite dialog.
function AccessFields({
  draft,
  setDraft,
  apps,
  roles,
}: {
  draft: Draft;
  setDraft: (d: Draft) => void;
  apps: Project[];
  roles: WorkspaceRole[];
}) {
  const limited = LIMITED.has(draft.role);
  return (
    <div className="grid gap-4">
      <div className="grid gap-1.5">
        <label htmlFor="role" className="text-sm font-semibold text-foreground">Role</label>
        <NativeSelect id="role" value={draft.role} onChange={(e) => setDraft({ ...draft, role: e.target.value as WorkspaceRole })}>
          {roles.map((r) => (
            <option key={r} value={r}>{ROLE_LABELS[r]}</option>
          ))}
        </NativeSelect>
        <p className="text-sm text-muted-foreground">{ROLE_HINTS[draft.role]}</p>
      </div>

      {limited && (
        <div className="grid gap-1.5">
          <label htmlFor="scope" className="text-sm font-semibold text-foreground">Apps</label>
          <NativeSelect id="scope" value={draft.appScope} onChange={(e) => setDraft({ ...draft, appScope: e.target.value as AppScope })}>
            <option value="all">All apps</option>
            <option value="selected">Only the apps I choose</option>
          </NativeSelect>
        </div>
      )}

      {limited && draft.appScope === "selected" && (
        <ul className="grid max-h-56 gap-2 overflow-y-auto">
          {apps.length === 0 && <li className="text-sm text-muted-foreground">No apps yet.</li>}
          {apps.map((a) => (
            <li key={a.id} className="flex items-center justify-between gap-3">
              <span className="truncate text-sm text-foreground">{a.name || a.slug}</span>
              <NativeSelect
                aria-label={`Access to ${a.name || a.slug}`}
                value={draft.apps[a.id] ?? "none"}
                onChange={(e) => {
                  const next = { ...draft.apps };
                  if (e.target.value === "none") delete next[a.id];
                  else next[a.id] = e.target.value as AppGrant["level"];
                  setDraft({ ...draft, apps: next });
                }}
              >
                <option value="none">No access</option>
                <option value="view">Can view</option>
                {draft.role === "developer" && <option value="manage">Can change</option>}
              </NativeSelect>
            </li>
          ))}
        </ul>
      )}

      {draft.role === "developer" && (
        <div className="grid gap-2">
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={draft.canCreate} onChange={(e) => setDraft({ ...draft, canCreate: e.target.checked })} />
            Can add new apps
          </label>
          <label className="flex items-center gap-2 text-sm text-foreground">
            <input type="checkbox" checked={draft.canDelete} onChange={(e) => setDraft({ ...draft, canDelete: e.target.checked })} />
            Can delete apps (they can always delete apps they added)
          </label>
        </div>
      )}
    </div>
  );
}

function grantsOf(draft: Draft): AppGrant[] {
  // A Viewer can only ever view, whatever was picked before a role change.
  return Object.entries(draft.apps).map(([projectId, level]) => ({
    projectId,
    level: draft.role === "viewer" ? "view" : level,
  }));
}

function AccessDialog({
  member,
  apps,
  roles,
  onClose,
  onSaved,
}: {
  member: Member | null;
  apps: Project[];
  roles: WorkspaceRole[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [draft, setDraft] = useState<Draft | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    setDraft(member ? draftOf(member) : null);
    setError(null);
  }, [member]);

  // An Owner can be shown as one even to an Admin who opened this by
  // recovery; keep their current role selectable so the dialog is honest.
  const options = useMemo(
    () => (member && !roles.includes(member.role) ? [member.role, ...roles] : roles),
    [member, roles],
  );

  async function save() {
    if (!activeCompanyId || !member || !draft) return;
    setSaving(true);
    setError(null);
    try {
      await membersApi.update(activeCompanyId, member.userId, {
        role: draft.role,
        appScope: draft.appScope,
        canCreate: draft.canCreate,
        canDelete: draft.canDelete,
      });
      if (LIMITED.has(draft.role) && draft.appScope === "selected") {
        await membersApi.setApps(activeCompanyId, member.userId, grantsOf(draft));
      }
      await onSaved();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={member != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>What {member?.name || member?.email || "they"} can do</DialogTitle>
          <DialogDescription>Takes effect on their next click, in the panel and for their AI.</DialogDescription>
        </DialogHeader>
        {draft && <AccessFields draft={draft} setDraft={setDraft} apps={apps} roles={options} />}
        {error && <Alert>{error}</Alert>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep as is</DialogClose>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function InviteDialog({
  open,
  apps,
  roles,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: Project[];
  roles: WorkspaceRole[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [email, setEmail] = useState("");
  const [draft, setDraft] = useState<Draft>({ role: "developer", appScope: "all", canCreate: true, canDelete: false, apps: {} });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setError(null);
    setSavedFor(null);
    setDraft({ role: "developer", appScope: "all", canCreate: true, canDelete: false, apps: {} });
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSaving(true);
    setError(null);
    try {
      await membersApi.invite(activeCompanyId, {
        email: email.trim(),
        role: draft.role,
        appScope: draft.appScope,
        canCreate: draft.canCreate,
        canDelete: draft.canDelete,
        grants: LIMITED.has(draft.role) && draft.appScope === "selected" ? grantsOf(draft) : [],
      });
      setSavedFor(email.trim());
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t save that.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (savedFor ? onSaved() : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite with a role</DialogTitle>
          <DialogDescription>
            Choose what they can do, then send the invite from the team list below.
          </DialogDescription>
        </DialogHeader>
        {savedFor ? (
          <>
            <Alert variant="info">
              Saved. Now invite {savedFor} from the team list below — they’ll get this role when they join.
            </Alert>
            <DialogFooter>
              <Button onClick={() => onSaved()}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form className="grid gap-4" onSubmit={save}>
            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-semibold text-foreground">Email</label>
              <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <AccessFields draft={draft} setDraft={setDraft} apps={apps} roles={roles} />
            {error && <Alert>{error}</Alert>}
            <DialogFooter>
              <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
              <Button type="submit" disabled={saving || !email.trim()}>{saving ? "Saving…" : "Save role"}</Button>
            </DialogFooter>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
}
