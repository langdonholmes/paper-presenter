import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  type ReactNode,
  type Dispatch,
} from "react";
import { ask } from "@tauri-apps/plugin-dialog";
import type { ProjectFile } from "../types";
import {
  projectReducer,
  createEmptyProject,
  type ProjectAction,
} from "./project-reducer";
import { openProject, saveProject, selectPdf } from "./file-io";
import { localFileUrl } from "./asset-url";
import { resolvePdfPath } from "./file-io";
import { useToast } from "../lib/ToastContext";
import { exportDeckBeside, exportDeckHtml } from "../export/deck-export-io";
import { basename } from "../export/deck-export";

interface ProjectState {
  project: ProjectFile;
  dispatch: Dispatch<ProjectAction>;
  filePath: string | null;
  pdfAbsolutePath: string | null;
  pdfUrl: string | null;
  dirty: boolean;
  selectedWaypointIndex: number;
  setSelectedWaypointIndex: (i: number) => void;
  doNew: () => Promise<void>;
  doOpen: () => Promise<void>;
  doSave: () => Promise<void>;
  doSaveAs: () => Promise<void>;
  doSelectPdf: () => Promise<void>;
  doExportHtml: () => Promise<void>;
}

const ProjectContext = createContext<ProjectState | null>(null);

export function ProjectProvider({ children }: { children: ReactNode }) {
  const [project, rawDispatch] = useReducer(
    projectReducer,
    undefined,
    createEmptyProject,
  );
  const [filePath, setFilePath] = useState<string | null>(null);
  const [pdfAbsolutePath, setPdfAbsolutePath] = useState<string | null>(null);
  const [dirty, setDirty] = useState(false);
  const [selectedWaypointIndex, setSelectedWaypointIndex] = useState(0);
  const { toast } = useToast();

  const dispatch = useCallback(
    (action: ProjectAction) => {
      rawDispatch(action);
      if (action.type !== "LOAD_PROJECT") {
        setDirty(true);
      }
    },
    [],
  );

  const updatePdfFromPath = useCallback(
    (absPath: string | null) => {
      setPdfAbsolutePath(absPath);
    },
    [],
  );

  /** Returns false if the user cancelled. */
  const guardDirty = useCallback(async (): Promise<boolean> => {
    if (!dirty) return true;
    return ask("You have unsaved changes. Discard them?", {
      title: "Unsaved Changes",
      kind: "warning",
      okLabel: "Discard",
      cancelLabel: "Cancel",
    });
  }, [dirty]);

  const doNew = useCallback(async () => {
    if (!(await guardDirty())) return;
    rawDispatch({ type: "LOAD_PROJECT", project: createEmptyProject() });
    setFilePath(null);
    setPdfAbsolutePath(null);
    setDirty(false);
    setSelectedWaypointIndex(0);
  }, [guardDirty]);

  const doOpen = useCallback(async () => {
    if (!(await guardDirty())) return;
    const result = await openProject();
    if (!result) return;

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    const { project: loaded, filePath: path } = result.value;
    rawDispatch({ type: "LOAD_PROJECT", project: loaded });
    setFilePath(path);
    setDirty(false);
    setSelectedWaypointIndex(0);

    if (loaded.pdfPath) {
      const abs = resolvePdfPath(path, loaded.pdfPath);
      updatePdfFromPath(abs);
    } else {
      updatePdfFromPath(null);
    }
  }, [guardDirty, updatePdfFromPath, toast]);

  /**
   * Refresh the HTML backup that sits beside the project file.
   *
   * Reported rather than swallowed: a backup that quietly stopped updating is
   * worse than none, because it looks current right up until it is needed.
   */
  const finishSave = useCallback(
    async (savedPath: string) => {
      setFilePath(savedPath);
      setDirty(false);

      const exported = await exportDeckBeside(project, savedPath);
      if (!exported.ok) {
        toast(`Saved, but the HTML backup failed: ${exported.error}`, "error");
        return;
      }
      toast("Project saved", "success");
    },
    [project, toast],
  );

  const doSave = useCallback(async () => {
    const result = await saveProject(project, filePath);
    if (!result) return;

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    await finishSave(result.value);
  }, [project, filePath, toast, finishSave]);

  const doSaveAs = useCallback(async () => {
    const result = await saveProject(project, null);
    if (!result) return;

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }

    await finishSave(result.value);
  }, [project, toast, finishSave]);

  const doExportHtml = useCallback(async () => {
    const result = await exportDeckHtml(project, filePath);
    if (!result) return;

    if (!result.ok) {
      toast(result.error, "error");
      return;
    }
    toast(`Exported ${basename(result.value)}`, "success");
  }, [project, filePath, toast]);

  const doSelectPdf = useCallback(async () => {
    const path = await selectPdf();
    if (!path) return;
    dispatch({ type: "SET_PDF_PATH", pdfPath: path });
    updatePdfFromPath(path);
  }, [dispatch, updatePdfFromPath]);

  const pdfUrl = pdfAbsolutePath ? localFileUrl(pdfAbsolutePath) : null;

  return (
    <ProjectContext.Provider
      value={{
        project,
        dispatch,
        filePath,
        pdfAbsolutePath,
        pdfUrl,
        dirty,
        selectedWaypointIndex,
        setSelectedWaypointIndex,
        doNew,
        doOpen,
        doSave,
        doSaveAs,
        doSelectPdf,
        doExportHtml,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProject(): ProjectState {
  const ctx = useContext(ProjectContext);
  if (!ctx)
    throw new Error("useProject must be used within a ProjectProvider");
  return ctx;
}
