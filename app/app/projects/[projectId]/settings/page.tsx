"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
import { Alert, Fact, FactGrid, Page, PageHeader, Panel, PanelTitle, Skeleton } from "../../../../components/console/kit";
import { Button } from "../../../../components/ui/button";
import { Input } from "../../../../components/ui/input";
import { projectsApi } from "../../../../lib/hnsApi";
import { formatDate } from "../../../../lib/format";
import { atLeast, useSession } from "../../../../lib/session";
import { useProject } from "../../../../lib/useProject";

export default function ProjectSettingsPage({ params }: { params: Promise<{ projectId: string }> }) {
  const { projectId } = use(params);
  const { activeCompanyId, role } = useSession();
  const canWrite = atLeast(role, "project_admin");
  const { project, error, reload } = useProject(activeCompanyId, projectId);
  const router = useRouter();

  const [name, setName] = useState("");
  const [memory, setMemory] = useState("");
  const [savingName, setSavingName] = useState(false);
  const [savingMem, setSavingMem] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [formErr, setFormErr] = useState<string | null>(null);
  const [confirm, setConfirm] = useState("");
  const [deleting, setDeleting] = useState(false);
  const [delErr, setDelErr] = useState<string | null>(null);

  useEffect(() => {
    if (project) {
      setName(project.name);
      setMemory(String(project.memoryMb));
    }
  }, [project]);

  async function rename(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    setSavingName(true);
    setNotice(null);
    setFormErr(null);
    try {
      await projectsApi.rename(activeCompanyId, projectId, name.trim());
      setNotice("Display name updated. The slug and live URL never change.");
      await reload();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Couldn’t rename the project.");
    } finally {
      setSavingName(false);
    }
  }

  async function saveMemory(e: React.FormEvent) {
    e.preventDefault();
    if (!activeCompanyId) return;
    const mb = Number(memory);
    if (!Number.isInteger(mb) || mb <= 0) {
      setFormErr("Memory must be a whole number of MB greater than 0.");
      return;
    }
    setSavingMem(true);
    setNotice(null);
    setFormErr(null);
    try {
      await projectsApi.setMemory(activeCompanyId, projectId, mb);
      setNotice("Requested memory saved. It applies on the next deploy — the running container isn’t resized now.");
      await reload();
    } catch (e) {
      setFormErr(e instanceof Error ? e.message : "Couldn’t update memory.");
    } finally {
      setSavingMem(false);
    }
  }

  async function del() {
    if (!activeCompanyId) return;
    setDeleting(true);
    setDelErr(null);
    try {
      await projectsApi.remove(activeCompanyId, projectId);
      router.push("/app");
    } catch (e) {
      setDelErr(e instanceof Error ? e.message : "Couldn’t delete the project.");
      setDeleting(false);
    }
  }

  if (error) return <Page><Alert>{error}</Alert></Page>;
  if (!project) return <Page><Skeleton className="h-40" aria-hidden="true" /></Page>;

  return (
    <Page>
      <PageHeader title="Settings" subtitle={`Configuration for ${project.name}.`} />

      {notice && <Alert variant="info">{notice}</Alert>}
      {formErr && <Alert>{formErr}</Alert>}

      <Panel padded>
        <PanelTitle>Project</PanelTitle>
        <FactGrid flush>
          <Fact flush k="Slug (immutable)" v={project.slug} mono />
          <Fact flush k="Project ID" v={project.id} mono />
          <Fact flush k="Created" v={formatDate(project.createdAt)} />
        </FactGrid>

        {canWrite && (
          <>
            <form className="mt-4 flex flex-wrap gap-2.5" onSubmit={rename}>
              <Input className="min-w-[220px] flex-1" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Display name" />
              <Button type="submit" disabled={savingName || !name.trim() || name.trim() === project.name}>{savingName ? "Saving…" : "Rename"}</Button>
            </form>
            <form className="mt-2.5 flex flex-wrap gap-2.5" onSubmit={saveMemory}>
              <Input className="min-w-[220px] flex-1 font-mono" type="number" min={1} value={memory} onChange={(e) => setMemory(e.target.value)} aria-label="Requested memory (MB)" />
              <Button type="submit" variant="outline" disabled={savingMem || memory === String(project.memoryMb)}>{savingMem ? "Saving…" : "Set memory (MB)"}</Button>
            </form>
          </>
        )}
        <p className="mt-3 text-[0.92rem] text-muted-foreground">Renaming changes the display name only — the slug <code className="border border-border bg-elevated px-1 py-0.5 font-mono text-[0.85em] text-foreground">{project.slug}</code>, and therefore the live URL, never changes.</p>
      </Panel>

      {canWrite && (
        <Panel padded tone="danger">
          <PanelTitle tone="danger">Danger zone</PanelTitle>
          <p className="mt-1 text-[0.92rem] text-muted-foreground">
            Deleting <b className="text-foreground">{project.name}</b> removes it from the console. Note: this <b className="text-foreground">doesn’t stop the running app</b> yet —
            the deployed container keeps running until the backend adds a teardown step.
          </p>
          {delErr && <Alert className="mt-3">{delErr}</Alert>}
          <div className="mt-3.5 flex flex-wrap gap-2.5">
            <Input className="min-w-[220px] flex-1" placeholder={`Type “${project.name}” to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <Button variant="destructive" disabled={deleting || confirm !== project.name} onClick={del}>{deleting ? "Deleting…" : "Delete project"}</Button>
          </div>
        </Panel>
      )}
    </Page>
  );
}
