"use client";

import { useCallback, useEffect, useState } from "react";
import { XIcon } from "lucide-react";
import { Alert, LinkButton, NativeSelect, PageHeader, Panel, Skeleton } from "./kit";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "../ui/dialog";
import { membersApi, projectsApi } from "../../lib/hnsApi";
import {
  ACCESS_LABELS,
  ACCESS_OPTIONS,
  ACCESS_LEVELS,
  DEFAULT_LEVEL,
  LEVEL_HINTS,
  LEVEL_LABELS,
  ROLE_HINTS,
  ROLE_LABELS,
  usePermissions,
} from "../../lib/permissions";
import { useSession } from "../../lib/session";
import type { AccessLevel, AppAccess, AppGrant, Member, MembersList, MyPermissions, PendingInvite, Project, WorkspaceRole } from "../../lib/types";

// The members page: who is in the workspace, what each of them can do, and
// who is invited. All of it is hostnsoft-api (roles, access, and the invite
// email and removal it does through the sign-in service as the caller).
//
// People with members.manage (Owner, Admin) get the editable list; everyone
// else sees names, emails and roles, plus a card with their own access and
// who to ask for more. The API enforces every rule here itself — an Admin
// can't touch Owners or Admins, nobody changes or removes themselves — so
// the page only disables what would be refused, and says why.

const OWNERISH: ReadonlySet<WorkspaceRole> = new Set(["owner", "admin"]);
// The order roles are offered in.
const ROLE_ORDER: WorkspaceRole[] = ["member", "admin", "billing", "owner"];
const OWNER_ONLY = "Only an Owner can change Owners and Admins.";

// projectId -> level, for the apps ticked in "Choose apps…".
type Grants = Record<string, AccessLevel>;

function grantsOf(apps: AppGrant[]): Grants {
  return Object.fromEntries(apps.map((a) => [a.projectId, a.level]));
}

function toList(grants: Grants): AppGrant[] {
  return Object.entries(grants).map(([projectId, level]) => ({ projectId, level }));
}

function sameGrants(a: Grants, b: Grants): boolean {
  const ka = Object.keys(a);
  return ka.length === Object.keys(b).length && ka.every((k) => a[k] === b[k]);
}

function errorText(e: unknown, fallback: string): string {
  return e instanceof Error && e.message ? e.message : fallback;
}

function displayName(p: { name: string | null; email: string | null }): string {
  return p.name || p.email || "Someone";
}

function firstName(p: { name: string | null; email: string | null }): string {
  return p.name?.trim().split(/\s+/)[0] || p.email || "Someone";
}

function initials(p: { name: string | null; email: string | null }): string {
  const source = p.name?.trim() || p.email?.split("@")[0] || "?";
  return source
    .split(/[\s._-]+/)
    .filter(Boolean)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

// "Can use all apps", or for chosen apps "Can edit · only 2 apps" (the level
// only when every app shares it). Apps someone added are theirs in full
// whatever this says, so they aren't counted.
function accessSummary(access: AppAccess | null, apps: AppGrant[], created: ReadonlySet<string> = new Set()): string {
  if (!access || access !== "chosen") return ACCESS_LABELS[access ?? DEFAULT_LEVEL];
  const given = apps.filter((a) => !created.has(a.projectId));
  if (given.length === 0) return created.size ? "Only apps they added" : "No apps yet";
  const levels = new Set(given.map((a) => a.level));
  const lead = levels.size === 1 ? `${LEVEL_LABELS[given[0].level]} · ` : "";
  return `${lead}only ${given.length} ${given.length === 1 ? "app" : "apps"}`;
}

function accessHint(access: AppAccess): string {
  return access === "chosen" ? "They only see the apps you tick." : "Includes apps added later.";
}

function appName(p: Project): string {
  return p.name || p.slug;
}

function joinNames(names: string[]): string {
  if (names.length <= 1) return names.join("");
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function Members() {
  const { activeCompanyId, activeCompany } = useSession();
  const { can, role: myRole, data: mine, settled } = usePermissions();
  const [list, setList] = useState<MembersList | null>(null);
  const [apps, setApps] = useState<Project[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [rowError, setRowError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [editing, setEditing] = useState<Member | null>(null);
  const [removing, setRemoving] = useState<Member | null>(null);

  // Held until permissions load, so nobody gets a moment of controls that
  // would only end in "you don't have permission".
  const canManage = settled && can("members.manage");
  const isOwner = myRole === "owner";
  const workspace = activeCompany?.companyName || "this workspace";

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setLoadError(null);
    try {
      const [members, projects] = await Promise.all([
        membersApi.list(activeCompanyId),
        projectsApi.list(activeCompanyId).catch(() => [] as Project[]),
      ]);
      setList(members);
      setApps(projects);
    } catch (e) {
      setLoadError(errorText(e, "Couldn’t load the members."));
    }
  }, [activeCompanyId]);

  useEffect(() => {
    setList(null);
    load();
  }, [load]);

  // Why this person's row can't be changed by me, or null when it can.
  function lockReason(m: Member): string | null {
    if (m.isYou) return "You can’t change your own role or remove yourself.";
    if (OWNERISH.has(m.role) && !isOwner) return OWNER_ONLY;
    return null;
  }

  async function changeRole(m: Member, role: WorkspaceRole) {
    if (!activeCompanyId || role === m.role) return;
    setBusy(m.userId);
    setRowError(null);
    try {
      await membersApi.update(activeCompanyId, m.userId, { role });
      await load();
    } catch (e) {
      setRowError(errorText(e, "Couldn’t change that role."));
    } finally {
      setBusy(null);
    }
  }

  async function cancelInvite(i: PendingInvite) {
    if (!activeCompanyId) return;
    setBusy(i.id);
    setRowError(null);
    try {
      await membersApi.cancelInvite(activeCompanyId, i.id);
      await load();
    } catch (e) {
      setRowError(errorText(e, "Couldn’t cancel that invite."));
    } finally {
      setBusy(null);
    }
  }

  const createdBy = (userId: string) => new Set(apps.filter((a) => a.createdBy === userId).map((a) => a.id));
  const count = list?.members.length ?? 0;

  return (
    <>
      <PageHeader
        title="Members"
        subtitle={list ? `${count} ${count === 1 ? "person" : "people"} in ${workspace}` : undefined}
        actions={canManage && <Button onClick={() => setInviting(true)}>Invite</Button>}
      />

      {loadError && (
        <Alert>
          {loadError}{" "}
          <LinkButton className="ml-1 text-destructive" onClick={() => load()}>
            Try again
          </LinkButton>
        </Alert>
      )}
      {rowError && <Alert>{rowError}</Alert>}

      {!list ? (
        !loadError && <Skeleton className="h-56" aria-hidden="true" />
      ) : (
        <>
          {!list.complete && <Alert variant="note">Some people may be missing from this list.</Alert>}

          <Panel className="overflow-hidden">
            <ul className="divide-y divide-border" aria-label="Members">
              {list.members.map((m) => {
                const name = displayName(m);
                const locked = lockReason(m);
                return (
                  <li key={m.userId} className="flex flex-wrap items-center gap-3.5 px-5 py-4">
                    <span
                      aria-hidden="true"
                      className="flex size-10 shrink-0 items-center justify-center rounded-full bg-elevated text-sm font-semibold text-muted-foreground"
                    >
                      {initials(m)}
                    </span>
                    <div className="flex min-w-0 flex-[1_1_220px] flex-col gap-0.5">
                      <p className="truncate text-[0.95rem] font-medium text-foreground">
                        {name}
                        {m.isYou && <span className="font-normal text-muted-foreground"> (you)</span>}
                      </p>
                      {m.name && m.email && <p className="truncate text-sm text-muted-foreground">{m.email}</p>}
                      {canManage && m.role === "member" && (
                        <button
                          type="button"
                          onClick={() => setEditing(m)}
                          className="mt-1 cursor-pointer self-start text-[0.82rem] text-foreground underline underline-offset-[3px] hover:text-muted-foreground"
                        >
                          {accessSummary(m.access, m.apps, createdBy(m.userId))}
                        </button>
                      )}
                    </div>

                    {canManage ? (
                      <div className="flex items-center gap-1.5">
                        <span title={locked ?? undefined}>
                          <NativeSelect
                            aria-label={`Role for ${name}`}
                            className="h-10 min-w-[120px]"
                            value={m.role}
                            disabled={!!locked || busy === m.userId}
                            onChange={(e) => changeRole(m, e.target.value as WorkspaceRole)}
                          >
                            {(["owner", "admin", "member", "billing"] as WorkspaceRole[]).map((r) => (
                              <option key={r} value={r} disabled={!isOwner && OWNERISH.has(r) && r !== m.role}>
                                {ROLE_LABELS[r]}
                                {!isOwner && OWNERISH.has(r) && r !== m.role ? " (Owners only)" : ""}
                              </option>
                            ))}
                          </NativeSelect>
                        </span>
                        <span title={locked ?? undefined}>
                          <Button
                            variant="ghost"
                            size="icon-lg"
                            aria-label={`Remove ${name}`}
                            disabled={!!locked || busy === m.userId}
                            onClick={() => setRemoving(m)}
                            className="text-muted-foreground hover:text-foreground"
                          >
                            <XIcon className="size-[18px]" />
                          </Button>
                        </span>
                      </div>
                    ) : (
                      <span className="min-w-[80px] text-right text-sm text-muted-foreground">{ROLE_LABELS[m.role]}</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>

          {canManage && list.invites.length > 0 && (
            <section className="flex flex-col gap-2.5" aria-labelledby="invited-heading">
              <h2 id="invited-heading" className="text-sm font-semibold text-muted-foreground">
                Invited
              </h2>
              <Panel className="overflow-hidden">
                <ul className="divide-y divide-border">
                  {list.invites.map((i) => {
                    const locked = OWNERISH.has(i.role) && !isOwner ? "Only an Owner can cancel an Owner or Admin invite." : null;
                    return (
                      <li key={i.id} className="flex flex-wrap items-center gap-3.5 px-5 py-3.5">
                        <span className="min-w-0 flex-[1_1_220px] truncate text-[0.95rem] text-foreground">{i.email}</span>
                        <span className="text-sm text-muted-foreground">
                          {ROLE_LABELS[i.role]}
                          {i.role === "member" && ` · ${accessSummary(i.access, i.apps)}`}
                        </span>
                        <span title={locked ?? undefined}>
                          <Button
                            variant="outline"
                            size="sm"
                            className="rounded-full"
                            disabled={!!locked || busy === i.id}
                            onClick={() => cancelInvite(i)}
                          >
                            {busy === i.id ? "Cancelling…" : "Cancel"}
                          </Button>
                        </span>
                      </li>
                    );
                  })}
                </ul>
              </Panel>
            </section>
          )}

          {settled && !canManage && <YourAccess mine={mine} members={list.members} apps={apps} />}
        </>
      )}

      <InviteDialog
        open={inviting}
        apps={apps}
        isOwner={isOwner}
        workspace={workspace}
        onClose={() => setInviting(false)}
        onSaved={async () => {
          setInviting(false);
          await load();
        }}
      />
      <AccessDialog
        member={editing}
        apps={apps}
        onClose={() => setEditing(null)}
        onSaved={async () => {
          setEditing(null);
          await load();
        }}
      />
      <RemoveDialog
        member={removing}
        workspace={workspace}
        onClose={() => setRemoving(null)}
        onRemoved={async () => {
          setRemoving(null);
          await load();
        }}
      />
    </>
  );
}

// What someone without members.manage can do, in a sentence, and who to ask.
function YourAccess({ mine, members, apps }: { mine: MyPermissions | null; members: Member[]; apps: Project[] }) {
  if (!mine) return null;
  const managers = members.filter((m) => OWNERISH.has(m.role) && !m.isYou).map(firstName);
  const ask = managers.length
    ? `Need more? Ask an Owner or Admin: ${joinNames(managers.length > 3 ? [...managers.slice(0, 3), "others"] : managers)}.`
    : "Need more? Ask an Owner or Admin.";

  let line: string;
  if (mine.role !== "member") {
    line = ROLE_HINTS[mine.role];
  } else {
    const names = new Map(apps.map((a) => [a.id, appName(a)]));
    const added = new Set(apps.filter((a) => a.createdBy === mine.userId).map((a) => a.id));
    const addedNames = [...added].map((id) => names.get(id)).filter(Boolean) as string[];
    const addedPart = addedNames.length
      ? `Full access to ${joinNames(addedNames)} (you added ${addedNames.length === 1 ? "it" : "them"})`
      : "";
    if (mine.access && mine.access !== "chosen") {
      const all = { use: "You can use all apps", edit: "You can edit all apps", full: "You have full access to all apps" }[mine.access];
      line = mine.access !== "full" && addedPart ? `${all}. ${addedPart}.` : `${all}.`;
    } else {
      const reachable = mine.apps.filter((a) => names.has(a.projectId));
      const byLevel = (level: AccessLevel) =>
        reachable.filter((a) => a.level === level && !added.has(a.projectId)).map((a) => names.get(a.projectId)!);
      const parts = [
        addedPart,
        byLevel("full").length ? `Full access to ${joinNames(byLevel("full"))}` : "",
        byLevel("edit").length ? `Can edit on ${joinNames(byLevel("edit"))}` : "",
        byLevel("use").length ? `Can use ${joinNames(byLevel("use"))}` : "",
      ].filter(Boolean);
      const n = reachable.length;
      line = n ? `You have ${n} ${n === 1 ? "app" : "apps"}: ${parts.join(", ")}.` : "You don’t have any apps yet.";
    }
  }

  return (
    <Panel className="flex flex-col gap-1.5 px-5 py-4">
      <h2 className="text-[0.95rem] font-medium text-foreground">Your access</h2>
      <p className="text-sm text-muted-foreground">{line}</p>
      <p className="text-sm text-muted-foreground">{ask}</p>
    </Panel>
  );
}

// The Access picker plus, for "Choose apps…", the app checklist. Apps the
// person added (createdBy) are theirs in full: ticked and locked.
function AccessFields({
  id,
  access,
  setAccess,
  grants,
  setGrants,
  apps,
  createdBy,
}: {
  id: string;
  access: AppAccess;
  setAccess: (a: AppAccess) => void;
  grants: Grants;
  setGrants: (g: Grants) => void;
  apps: Project[];
  createdBy?: string;
}) {
  return (
    <>
      <div className="grid gap-1.5">
        <label htmlFor={`${id}-access`} className="text-sm font-semibold text-foreground">
          Access
        </label>
        <NativeSelect
          id={`${id}-access`}
          className="h-10"
          value={access}
          onChange={(e) => setAccess(e.target.value as AppAccess)}
          aria-describedby={`${id}-access-hint`}
        >
          {ACCESS_OPTIONS.map((a) => (
            <option key={a} value={a}>
              {ACCESS_LABELS[a]}
            </option>
          ))}
        </NativeSelect>
        <p id={`${id}-access-hint`} className="text-[0.82rem] text-muted-foreground">
          {accessHint(access)}
        </p>
      </div>

      {access === "chosen" && (
        <ul className="max-h-64 divide-y divide-border overflow-y-auto rounded-lg border border-border" aria-label="Apps">
          {apps.length === 0 && <li className="px-3.5 py-3 text-sm text-muted-foreground">No apps yet.</li>}
          {apps.map((a) => {
            const name = appName(a);
            const added = !!createdBy && a.createdBy === createdBy;
            const level: AccessLevel | undefined = added ? "full" : grants[a.id];
            const boxId = `${id}-app-${a.id}`;
            return (
              <li key={a.id} className="flex flex-wrap items-center gap-3 px-3.5 py-2.5">
                <label htmlFor={boxId} className="flex min-w-0 flex-1 cursor-pointer items-center gap-2.5 text-sm text-foreground">
                  <input
                    id={boxId}
                    type="checkbox"
                    className="size-4 shrink-0 cursor-pointer accent-foreground disabled:cursor-default"
                    checked={!!level}
                    disabled={added}
                    onChange={(e) => {
                      const next = { ...grants };
                      if (e.target.checked) next[a.id] = DEFAULT_LEVEL;
                      else delete next[a.id];
                      setGrants(next);
                    }}
                  />
                  <span className="truncate">
                    {name}
                    {added && <span className="text-muted-foreground"> (added it)</span>}
                  </span>
                </label>
                {level && (
                  <NativeSelect
                    aria-label={`Access to ${name}`}
                    title={LEVEL_HINTS[level]}
                    className="h-9 py-1"
                    value={level}
                    disabled={added}
                    onChange={(e) => setGrants({ ...grants, [a.id]: e.target.value as AccessLevel })}
                  >
                    {ACCESS_LEVELS.map((l) => (
                      <option key={l} value={l}>
                        {LEVEL_LABELS[l]}
                      </option>
                    ))}
                  </NativeSelect>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}

function InviteDialog({
  open,
  apps,
  isOwner,
  workspace,
  onClose,
  onSaved,
}: {
  open: boolean;
  apps: Project[];
  isOwner: boolean;
  workspace: string;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [email, setEmail] = useState("");
  const [role, setRole] = useState<WorkspaceRole>("member");
  const [access, setAccess] = useState<AppAccess>(DEFAULT_LEVEL);
  const [grants, setGrants] = useState<Grants>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setEmail("");
    setRole("member");
    setAccess(DEFAULT_LEVEL);
    setGrants({});
    setError(null);
  }, [open]);

  async function send(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSaving(true);
    setError(null);
    try {
      await membersApi.invite(activeCompanyId, {
        email: email.trim(),
        role,
        ...(role === "member" ? { access } : {}),
        ...(role === "member" && access === "chosen" ? { grants: toList(grants) } : {}),
      });
      await onSaved();
    } catch (err) {
      // The API's own sentence: already in, Owner-only, or the email failing.
      setError(errorText(err, "Couldn’t send the invite."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">Invite to {workspace}</DialogTitle>
        </DialogHeader>
        <form className="grid gap-5" onSubmit={send}>
          <div className="grid gap-1.5">
            <label htmlFor="invite-email" className="text-sm font-semibold text-foreground">
              Email
            </label>
            <Input
              id="invite-email"
              type="email"
              required
              autoComplete="off"
              placeholder="name@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
          <div className="grid gap-1.5">
            <label htmlFor="invite-role" className="text-sm font-semibold text-foreground">
              Role
            </label>
            <NativeSelect
              id="invite-role"
              className="h-10"
              value={role}
              aria-describedby="invite-role-hint"
              onChange={(e) => setRole(e.target.value as WorkspaceRole)}
            >
              {ROLE_ORDER.map((r) => {
                const ownerOnly = !isOwner && OWNERISH.has(r);
                return (
                  <option key={r} value={r} disabled={ownerOnly}>
                    {ROLE_LABELS[r]}
                    {ownerOnly ? " (Owners only)" : ""}
                  </option>
                );
              })}
            </NativeSelect>
            <p id="invite-role-hint" className="text-[0.82rem] text-muted-foreground">
              {ROLE_HINTS[role]}
            </p>
          </div>
          {role === "member" && (
            <AccessFields id="invite" access={access} setAccess={setAccess} grants={grants} setGrants={setGrants} apps={apps} />
          )}
          {error && <Alert>{error}</Alert>}
          <DialogFooter>
            <DialogClose render={<Button variant="outline" type="button" />}>Cancel</DialogClose>
            <Button type="submit" disabled={saving || !email.trim()}>
              {saving ? "Sending…" : "Send invite"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function AccessDialog({
  member,
  apps,
  onClose,
  onSaved,
}: {
  member: Member | null;
  apps: Project[];
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [access, setAccess] = useState<AppAccess>(DEFAULT_LEVEL);
  const [grants, setGrants] = useState<Grants>({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!member) return;
    setAccess(member.access ?? DEFAULT_LEVEL);
    setGrants(grantsOf(member.apps));
    setError(null);
  }, [member]);

  async function save() {
    if (!activeCompanyId || !member) return;
    const before = member.access ?? DEFAULT_LEVEL;
    // Apps they added are full whatever is sent; leave them out.
    const added = new Set(apps.filter((a) => a.createdBy === member.userId).map((a) => a.id));
    const wanted = Object.fromEntries(Object.entries(grants).filter(([id]) => !added.has(id)));
    const had = Object.fromEntries(Object.entries(grantsOf(member.apps)).filter(([id]) => !added.has(id)));
    const changeAccess = access !== before;
    const changeApps = access === "chosen" && (changeAccess || !sameGrants(had, wanted));
    if (!changeAccess && !changeApps) return onClose();

    setSaving(true);
    setError(null);
    try {
      // Access first: moving to "chosen" must land before the apps do, and
      // moving away from it clears their apps on its own.
      if (changeAccess) await membersApi.update(activeCompanyId, member.userId, { role: "member", access });
      if (changeApps) await membersApi.setApps(activeCompanyId, member.userId, toList(wanted));
      await onSaved();
    } catch (e) {
      setError(errorText(e, "Couldn’t save that."));
    } finally {
      setSaving(false);
    }
  }

  return (
    <Dialog open={member != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-h-[92vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-xl">{member ? `${firstName(member)}’s access` : "Access"}</DialogTitle>
        </DialogHeader>
        {member && (
          <div className="grid gap-5">
            <AccessFields
              id="member"
              access={access}
              setAccess={setAccess}
              grants={grants}
              setGrants={setGrants}
              apps={apps}
              createdBy={member.userId}
            />
          </div>
        )}
        {error && <Alert>{error}</Alert>}
        <DialogFooter>
          <Button onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Done"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RemoveDialog({
  member,
  workspace,
  onClose,
  onRemoved,
}: {
  member: Member | null;
  workspace: string;
  onClose: () => void;
  onRemoved: () => Promise<void>;
}) {
  const { activeCompanyId } = useSession();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // Kept through the close animation so the copy doesn't blank out.
  const [shown, setShown] = useState<Member | null>(null);

  useEffect(() => {
    if (!member) return;
    setShown(member);
    setError(null);
  }, [member]);

  async function remove() {
    if (!activeCompanyId || !member) return;
    setSaving(true);
    setError(null);
    try {
      await membersApi.remove(activeCompanyId, member.userId);
      await onRemoved();
    } catch (e) {
      setError(errorText(e, "Couldn’t remove them."));
    } finally {
      setSaving(false);
    }
  }

  const name = shown ? displayName(shown) : "";
  return (
    <Dialog open={member != null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="text-xl leading-snug">
            Remove {name} from {workspace}?
          </DialogTitle>
          <DialogDescription>They lose access to every app.</DialogDescription>
        </DialogHeader>
        {error && <Alert>{error}</Alert>}
        <DialogFooter>
          <DialogClose render={<Button variant="outline" />}>Keep as is</DialogClose>
          <Button variant="destructive" onClick={remove} disabled={saving}>
            {saving ? "Removing…" : "Remove"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
