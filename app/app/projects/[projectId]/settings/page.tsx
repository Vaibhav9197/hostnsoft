"use client";

import { useRouter } from "next/navigation";
import { use, useEffect, useState } from "react";
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

  if (error) return <div className="con-page"><div className="con-alert err">{error}</div></div>;
  if (!project) return <div className="con-page"><div className="skeleton" style={{ height: 160 }} aria-hidden="true" /></div>;

  return (
    <div className="con-page">
      <div className="con-head">
        <div>
          <h1 className="con-h1">Settings</h1>
          <p className="con-sub">Configuration for {project.name}.</p>
        </div>
      </div>

      {notice && <div className="con-alert info">{notice}</div>}
      {formErr && <div className="con-alert err">{formErr}</div>}

      <section className="panel pad">
        <h2 className="panel-t">Project</h2>
        <div className="detail-facts flush">
          <div className="fact"><div className="fact-k">Slug (immutable)</div><div className="fact-v mono">{project.slug}</div></div>
          <div className="fact"><div className="fact-k">Project ID</div><div className="fact-v mono">{project.id}</div></div>
          <div className="fact"><div className="fact-k">Created</div><div className="fact-v">{formatDate(project.createdAt)}</div></div>
        </div>

        {canWrite && (
          <>
            <form className="token-create" style={{ marginTop: 16 }} onSubmit={rename}>
              <input className="con-input" value={name} onChange={(e) => setName(e.target.value)} maxLength={60} aria-label="Display name" />
              <button className="con-btn" type="submit" disabled={savingName || !name.trim() || name.trim() === project.name}>{savingName ? "Saving…" : "Rename"}</button>
            </form>
            <form className="token-create" style={{ marginTop: 10 }} onSubmit={saveMemory}>
              <input className="con-input mono" type="number" min={1} value={memory} onChange={(e) => setMemory(e.target.value)} aria-label="Requested memory (MB)" />
              <button className="con-btn ghost" type="submit" disabled={savingMem || memory === String(project.memoryMb)}>{savingMem ? "Saving…" : "Set memory (MB)"}</button>
            </form>
          </>
        )}
        <p className="con-sub" style={{ marginTop: 12 }}>Renaming changes the display name only — the slug <code>{project.slug}</code>, and therefore the live URL, never changes.</p>
      </section>

      {canWrite && (
        <section className="panel pad danger">
          <h2 className="panel-t">Danger zone</h2>
          <p className="con-sub" style={{ marginTop: 4 }}>
            Deleting <b>{project.name}</b> removes it from the console. Note: this <b>doesn’t stop the running app</b> yet —
            the deployed container keeps running until the backend adds a teardown step.
          </p>
          {delErr && <div className="con-alert err" style={{ marginTop: 12 }}>{delErr}</div>}
          <div className="danger-row">
            <input className="con-input" placeholder={`Type “${project.name}” to confirm`} value={confirm} onChange={(e) => setConfirm(e.target.value)} />
            <button className="con-btn danger" disabled={deleting || confirm !== project.name} onClick={del}>{deleting ? "Deleting…" : "Delete project"}</button>
          </div>
        </section>
      )}
    </div>
  );
}
