"use client";

import { useCallback, useEffect, useState } from "react";
import { Alert, LinkButton, NativeSelect, Panel, PanelTitle, Skeleton } from "./kit";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { membersApi, projectsApi } from "../../lib/hnsApi";
import { ACCESS_LEVELS, DEFAULT_LEVEL, LEVEL_HINTS, LEVEL_LABELS, LEVEL_RULE, ROLES, ROLE_HINTS, ROLE_LABELS, usePermissions } from "../../lib/permissions";
import { useSession } from "../../lib/session";
import type { AccessLevel, AppGrant, Member, MembersList, PendingInvite, Project, WorkspaceRole } from "../../lib/types";

// What each person in the workspace can do — the half of the members page
// that's ours. Adding and removing people (and the invite email) is the
// members embed below this, which is MSG91's; roles are kept by hostnsoft-api
// and checked there on every request. So this panel only ever changes roles
// and app access, and an invite here only remembers the role: the person is
// then invited from the embed, and gets that role the first time they arrive.
//
// A Member can use every app and has full access to the apps they added;
// the per-app list gives them more on particular apps. Other roles have no
// per-app access to set (Owner and Admin reach everything, Billing nothing).
//
// Inviting, like every change here, is members.manage: Owner and Admin.

const OWNERISH: ReadonlySet<WorkspaceRole> = new Set(["owner", "admin"]);

// projectId -> a level above the default "use". Apps at "use" aren't kept.
type Grants = Record<string, AccessLevel>;

function grantsOf(apps: AppGrant[]): Grants {
  return Object.fromEntries(apps.filter((a) => a.level !== DEFAULT_LEVEL).map((a) => [a.projectId, a.level]));
}

function toList(grants: Grants): AppGrant[] {
  return Object.entries(grants).map(([projectId, level]) => ({ projectId, level }));
}

function sameGrants(a: Grants, b: Grants): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

function moreAccessLine(count: number): string | null {
  if (count === 0) return null;
  return count === 1 ? "More access to 1 app" : `More access to ${count} apps`;
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

export function TeamRoles() {
  const { activeCompanyId } = useSession();
  const { can, role: myRole, data: mine, settled, reload: reloadMine } = usePermissions();
  const [list, setList] = useState<MembersList | null>(null);
  const [apps, setApps] = useState<Project[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [editing, setEditing] = useState<Member | null>(null);
  const [inviting, setInviting] = useState(false);

  // Held until permissions load, so nobody gets a moment of Change buttons
  // that would only end in "you don't have permission".
  const canManage = settled && can("members.manage");
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
      setError(errorText(e, "Couldn’t load your team."));
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  // Owners and Admins are an Owner's to change; the API says so too.
  const mayEdit = (m: Pick<Member, "role">) => canManage && (isOwner || !OWNERISH.has(m.role));
  // Cancelling an invite is the same rule as changing that role.
  const mayCancel = (i: PendingInvite) => mayEdit(i);

  async function cancelInvite(invite: PendingInvite) {
    if (!activeCompanyId) return;
    try {
      await membersApi.cancelInvite(activeCompanyId, invite.id);
      await load();
    } catch (e) {
      setError(errorText(e, "Couldn’t cancel that invite."));
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

      {/* Read-only for everyone else: say who to ask, once. */}
      {settled && !canManage && (
        <p className="mt-1 text-sm text-muted-foreground">
          Owners and Admins invite people and decide what each person can do.
        </p>
      )}
      {canManage && !isOwner && (
        <p className="mt-1 text-sm text-muted-foreground">Only an Owner can change Owners and Admins.</p>
      )}

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
            {list.members.map((m) => {
              const more = m.role === "member" ? moreAccessLine(m.apps.filter((a) => a.level !== DEFAULT_LEVEL).length) : null;
              return (
                <li key={m.userId} className="flex flex-wrap items-center justify-between gap-3 py-3">
                  <div className="min-w-0">
                    <p className="truncate text-[0.95rem] font-semibold text-foreground">
                      {m.name || m.email || "Someone"}
                      {m.isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
                    </p>
                    {m.name && m.email && <p className="truncate text-sm text-muted-foreground">{m.email}</p>}
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-right text-sm text-foreground">
                      {ROLE_LABELS[m.role]}
                      {more && <span className="block text-[0.8rem] text-muted-foreground">{more}</span>}
                    </span>
                    {mayEdit(m) && <LinkButton onClick={() => setEditing(m)}>Change</LinkButton>}
                  </div>
                </li>
              );
            })}
          </ul>

          {list.invites.length > 0 && (
            <>
              <p className="mt-4 text-sm font-semibold text-foreground">Waiting to join</p>
              <ul className="mt-1 divide-y divide-border">
                {list.invites.map((i) => {
                  const more = i.role === "member" ? moreAccessLine(i.apps.filter((a) => a.level !== DEFAULT_LEVEL).length) : null;
                  return (
                    <li key={i.id} className="flex flex-wrap items-center justify-between gap-3 py-2.5">
                      <span className="truncate text-sm text-foreground">{i.email}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-sm text-muted-foreground">
                          {ROLE_LABELS[i.role]}
                          {more && ` · ${more.toLowerCase()}`}
                        </span>
                        {mayCancel(i) && (
                          <LinkButton onClick={() => cancelInvite(i)}>Cancel</LinkButton>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ul>
            </>
          )}
        </>
      )}

      <AccessDialog
        member={editing}
        apps={apps}
        isOwner={isOwner}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await Promise.all([load(), reloadMine()]);
        }}
      />
      <InviteDialog
        open={inviting}
        apps={apps}
        isOwner={isOwner}
        onClose={() => setInviting(false)}
        onSaved={async () => {
          setInviting(false);
          await load();
        }}
      />
    </Panel>
  );
}

// The role picker. Owner and Admin stay in the list for an Admin, disabled,
// with the reason underneath — so the choice they can't make isn't a mystery.
function RoleField({
  role,
  current,
  isOwner,
  onChange,
}: {
  role: WorkspaceRole;
  // The member's role now, kept selectable even when it's one this person
  // couldn't pick (an Admin looking at an Owner by recovery).
  current?: WorkspaceRole;
  isOwner: boolean;
  onChange: (r: WorkspaceRole) => void;
}) {
  return (
    <div className="grid gap-1.5">
      <label htmlFor="role" className="text-sm font-semibold text-foreground">Role</label>
      <NativeSelect id="role" value={role} onChange={(e) => onChange(e.target.value as WorkspaceRole)}>
        {ROLES.map((r) => (
          <option key={r} value={r} disabled={!isOwner && OWNERISH.has(r) && r !== current}>
            {ROLE_LABELS[r]}
          </option>
        ))}
      </NativeSelect>
      <p className="text-sm text-muted-foreground">{ROLE_HINTS[role]}</p>
      {!isOwner && <p className="text-[0.8rem] text-muted-foreground">Only an Owner can make someone an Owner or Admin.</p>}
    </div>
  );
}

// A Member's access, app by app. Every app starts at "Can use"; apps they
// added are theirs in full and can't be lowered.
function AppAccessField({
  apps,
  grants,
  setGrants,
  memberId,
}: {
  apps: Project[];
  grants: Grants;
  setGrants: (g: Grants) => void;
  memberId?: string;
}) {
  return (
    <div className="grid gap-1.5">
      <p className="text-sm font-semibold text-foreground">Access to each app</p>
      <p className="text-sm text-muted-foreground">Every app starts at Can use. Give more where they need it.</p>
      <p className="text-[0.8rem] text-muted-foreground">{LEVEL_RULE}</p>
      <ul className="mt-1 grid max-h-64 gap-2 overflow-y-auto pr-1">
        {apps.length === 0 && <li className="text-sm text-muted-foreground">No apps yet.</li>}
        {apps.map((a) => {
          const name = a.name || a.slug;
          const created = !!memberId && a.createdBy === memberId;
          const level = grants[a.id] ?? DEFAULT_LEVEL;
          return (
            <li key={a.id} className="flex items-center justify-between gap-3">
              <span className="min-w-0 truncate text-sm text-foreground">{name}</span>
              {created ? (
                <span className="shrink-0 text-sm text-muted-foreground">Full access (created it)</span>
              ) : (
                <NativeSelect
                  aria-label={`Access to ${name}`}
                  title={LEVEL_HINTS[level]}
                  className="shrink-0"
                  value={level}
                  onChange={(e) => {
                    const next = { ...grants };
                    const value = e.target.value as AccessLevel;
                    if (value === DEFAULT_LEVEL) delete next[a.id];
                    else next[a.id] = value;
                    setGrants(next);
                  }}
                >
                  {ACCESS_LEVELS.map((l) => (
                    <option key={l} value={l}>
                      {l === DEFAULT_LEVEL ? `${LEVEL_LABELS[l]} (default)` : LEVEL_LABELS[l]}
                    </option>
                  ))}
                </NativeSelect>
              )}
            </li>
          );
        })}
      </ul>
      <ul className="mt-1 grid gap-0.5 text-[0.8rem] text-muted-foreground">
        {ACCESS_LEVELS.map((l) => (
          <li key={l}>
            <span className="font-semibold">{LEVEL_LABELS[l]}:</span> {LEVEL_HINTS[l]}
          </li>
        ))}
      </ul>
    </div>
  );
}

function AccessDialog({
  member,
  apps,
  isOwner,
  onClose,
  onSaved,
}: {
  member: Member | null;
  apps: Project[];
  isOwner: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [grants, setGrants] = useState<Grants>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setRole(member.role);
    setGrants(grantsOf(member.apps));
    setError(null);
  }, [member]);

  async function save() {
    if (!activeCompanyId || !member) return;
    setSaving(true);
    setError(null);
    const before = grantsOf(member.apps);
    try {
      // Leaving the Member role: their per-app access would do nothing, so
      // it goes first, while they're still a Member.
      if (member.role === "member" && role !== "member" && Object.keys(before).length) {
        await membersApi.setApps(activeCompanyId, member.userId, []);
      }
      if (role !== member.role) {
        await membersApi.update(activeCompanyId, member.userId, { role });
      }
      if (role === "member" && !sameGrants(before, grants)) {
        await membersApi.setApps(activeCompanyId, member.userId, toList(grants));
      }
      await onSaved();
    } catch (e) {
      // The API's own sentence: last Owner, Owner-only, and the like.
      setError(errorText(e, "Couldn’t save that."));
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
        {member && (
          <div className="grid gap-5">
            <RoleField role={role} current={member.role} isOwner={isOwner} onChange={setRole} />
            {role === "member" && (
              <AppAccessField apps={apps} grants={grants} setGrants={setGrants} memberId={member.userId} />
            )}
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep as is</DialogClose>
          <Button onClick={save} disabled={saving}>{saving ? "Saving…" : "Save"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// Owner/Admin choose a role and app access. Everyone else invites as a
// Member with the default access — the only invite the API takes from them —
// so they get just the email field.
function InviteDialog({
  open,
  apps,
  isOwner,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: Project[];
  isOwner: boolean;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [grants, setGrants] = useState<Grants>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [savedFor, setSavedFor] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("member");
    setGrants({});
    setError(null);
    setSavedFor(null);
  }, [open]);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSaving(true);
    setError(null);
    try {
      await membersApi.invite(activeCompanyId, {
        email: email.trim(),
        role,
        ...(role === "member" && Object.keys(grants).length ? { grants: toList(grants) } : {}),
      });
      setSavedFor(email.trim());
    } catch (e) {
      setError(errorText(e, "Couldn’t save that."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && (savedFor ? onSaved() : onClose())}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Invite with a role</DialogTitle>
          <DialogDescription>Choose what they can do, then send the invite from the team list below.</DialogDescription>
        </DialogHeader>
        {savedFor ? (
          <>
            <Alert variant="info">
              {`Saved. Now invite ${savedFor} from the team list below — they’ll get this role when they join.`}
            </Alert>
            <DialogFooter>
              <Button onClick={() => onSaved()}>Done</Button>
            </DialogFooter>
          </>
        ) : (
          <form className="grid gap-5" onSubmit={save}>
            <div className="grid gap-1.5">
              <label htmlFor="invite-email" className="text-sm font-semibold text-foreground">Email</label>
              <Input id="invite-email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <RoleField role={role} isOwner={isOwner} onChange={setRole} />
            {role === "member" && <AppAccessField apps={apps} grants={grants} setGrants={setGrants} />}
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
