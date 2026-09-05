"use client";

import { useCallback, useEffect, useState } from "react";
import { StatusPill } from "../../components/console/StatusPill";
import { Alert, LinkButton, Page, PageHeader, Panel, Skeleton, Tag } from "../../components/console/kit";
import { Button } from "../../components/ui/button";
import { Input } from "../../components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "../../components/ui/table";
import { membersApi } from "../../lib/hnsApi";
import { useSession } from "../../lib/session";
import type { Member } from "../../lib/types";

export default function MembersPage() {
  const { activeCompanyId, user } = useSession();
  const [members, setMembers] = useState<Member[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [email, setEmail] = useState("");
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
      await membersApi.invite(activeCompanyId, email.trim());
      setNotice(`Invited ${email.trim()}.`);
      setEmail("");
      await load();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn’t send the invite.");
    } finally {
      setBusy(false);
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
    <Page>
      <PageHeader title="Members" subtitle="People in this company." />

      <form className="flex flex-wrap gap-2.5" onSubmit={invite}>
        <Input
          className="min-w-[220px] flex-1"
          type="email"
          placeholder="teammate@company.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
        />
        <Button type="submit" disabled={busy || !email.trim()}>{busy ? "Inviting…" : "Invite"}</Button>
      </form>

      {error && <Alert>{error}</Alert>}
      {notice && <Alert variant="info">{notice}</Alert>}

      {!members && !error && <Skeleton className="h-[140px]" aria-hidden="true" />}

      {members && members.length > 0 && (
        <Panel>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Email</TableHead>
                <TableHead>Status</TableHead>
                <TableHead />
              </TableRow>
            </TableHeader>
            <TableBody>
              {members.map((m) => {
                const isSelf = m.userId === user?.id;
                return (
                  <TableRow key={m.userId}>
                    <TableCell>{m.email}{isSelf && <Tag>you</Tag>}</TableCell>
                    <TableCell><StatusPill status={m.status} /></TableCell>
                    <TableCell className="whitespace-nowrap text-right">
                      <LinkButton danger onClick={() => remove(m.userId, m.email)}>Remove</LinkButton>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </Panel>
      )}
    </Page>
  );
}
