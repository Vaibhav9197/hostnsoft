"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../components/console/StatusPill";
import { membersApi } from "../../lib/hnsApi";
import { ROLE_LABEL } from "../../lib/format";
import { atLeast, useSession } from "../../lib/session";
import type { Member, Role } from "../../lib/types";

const ROLES: Role[] = ["company_admin", "project_admin", "viewer"];

export default function MembersPage() {
  const { activeCompanyId, role: myRole, user } = useSession();
  const isAdmin = atLeast(myRole, "company_admin");
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [inviteRole, setInviteRole] = useState<Role>("viewer");
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!activeCompanyId) return;
    setMembers(null);
    setError(null);
    try {
      setMembers(await membersApi.list(activeCompanyId));
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t load members.");
    }
  }, [activeCompanyId]);

  useEffect(() => {
    load();
  }, [load]);

  async function invite(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setBusy(true);
    setError(null);
    setNotice(null);
    try {
      await membersApi.invite(activeCompanyId, email.trim(), inviteRole);
      setNotice(`Invited ${email.trim()} as ${ROLE_LABEL[inviteRole]}.`);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send the invite.");
    } finally {
      setBusy(false);
    }
  }

  async function changeRole(userId: string, role: Role) {
    if (!activeCompanyId) return;
    setError(null);
    setNotice(null);
    const prev = members;
    setMembers((m) => (m ?? []).map((x) => (x.userId === userId ? { ...x, role } : x)));
    try {
      await membersApi.setRole(activeCompanyId, userId, role);
    } catch (e) {
      setMembers(prev ?? null); // roll back optimistic change
      setError(e instanceof Error ? e.message : "Couldn’t change the role.");
    }
  }

  async function remove(userId: string, label: string) {
    if (!activeCompanyId) return;
    setError(null);
    setNotice(null);
    const prev = members;
    setMembers((m) => (m ?? []).filter((x) => x.userId !== userId));
    try {
      await membersApi.remove(activeCompanyId, userId);
      setNotice(`${label} removed.`);
    } catch (e) {
      setMembers(prev ?? null);
      setError(e instanceof Error ? e.message : "Couldn’t remove the member.");
    }
  }

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Members</h1>
          <p className="con-sub">People in this company and what they can do.</p>
        </div>
      </div>

      {isAdmin && (
        <form className="member-invite" onSubmit={invite}>
          <input
            className="con-input"
            type="email"
            placeholder="teammate@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <select className="con-select" value={inviteRole} onChange={(e) => setInviteRole(e.target.value as Role)} aria-label="Role">
            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
          </select>
          <button className="con-btn" type="submit" disabled={busy || !email.trim()}>{busy ? "Inviting…" : "Invite"}</button>
        </form>
      )}

      {error && <div className="con-alert err">{error}</div>}
      {notice && <div className="con-alert info">{notice}</div>}

      {!members && !error && <div className="skeleton" style={{ height: 140 }} aria-hidden="true" />}

      {members && members.length > 0 && (
        <section className="panel">
          <div className="con-scroll">
            <table className="con-table">
              <thead><tr><th>Email</th><th>Role</th><th>Status</th>{isAdmin && <th></th>}</tr></thead>
              <tbody>
                {members.map((m) => {
                  const isSelf = m.userId === user?.id;
                  return (
                    <tr key={m.userId}>
                      <td>{m.email}{isSelf && <span className="tag-you">you</span>}</td>
                      <td>
                        {isAdmin ? (
                          <select className="con-select sm" value={m.role} onChange={(e) => changeRole(m.userId, e.target.value as Role)}>
                            {ROLES.map((r) => <option key={r} value={r}>{ROLE_LABEL[r]}</option>)}
                          </select>
                        ) : ROLE_LABEL[m.role]}
                      </td>
                      <td><StatusPill status={m.status} /></td>
                      {isAdmin && (
                        <td className="row-action">
                          <button className="con-linkbtn danger" onClick={() => remove(m.userId, m.email)}>Remove</button>
                        </td>
                      )}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <p className="con-sub">A company must always keep at least one company admin — changes that would remove the last one are rejected.</p>
    </div>
  );
}
