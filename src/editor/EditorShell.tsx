import { ProjectProvider, useProject } from "../state/ProjectContext";

function EditorContent() {
  const {
    project,
    filePath,
    pdfUrl,
    dirty,
    doNew,
    doOpen,
    doSave,
    doSaveAs,
    doSelectPdf,
  } = useProject();

  return (
    <div style={{ padding: 24 }}>
      <h1 style={{ marginBottom: 8 }}>
        {project.meta.title}
        {dirty ? " *" : ""}
      </h1>

      <div style={{ display: "flex", gap: 8, marginBottom: 24 }}>
        <button onClick={doNew}>New</button>
        <button onClick={doOpen}>Open</button>
        <button onClick={doSave}>Save</button>
        <button onClick={doSaveAs}>Save As</button>
        <button onClick={doSelectPdf}>Select PDF</button>
      </div>

      <dl style={{ lineHeight: 2 }}>
        <dt style={{ color: "var(--subtext)", fontWeight: 600 }}>
          Project file
        </dt>
        <dd style={{ marginLeft: 16 }}>{filePath ?? "(unsaved)"}</dd>

        <dt style={{ color: "var(--subtext)", fontWeight: 600 }}>PDF path</dt>
        <dd style={{ marginLeft: 16 }}>
          {project.pdfPath || "(none selected)"}
        </dd>

        <dt style={{ color: "var(--subtext)", fontWeight: 600 }}>PDF URL</dt>
        <dd
          style={{
            marginLeft: 16,
            wordBreak: "break-all",
            fontSize: 13,
          }}
        >
          {pdfUrl ?? "—"}
        </dd>

        <dt style={{ color: "var(--subtext)", fontWeight: 600 }}>Waypoints</dt>
        <dd style={{ marginLeft: 16 }}>{project.waypoints.length}</dd>

        <dt style={{ color: "var(--subtext)", fontWeight: 600 }}>Highlights</dt>
        <dd style={{ marginLeft: 16 }}>{project.highlights.length}</dd>
      </dl>
    </div>
  );
}

export default function EditorShell() {
  return (
    <ProjectProvider>
      <EditorContent />
    </ProjectProvider>
  );
}
