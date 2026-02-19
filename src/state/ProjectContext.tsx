import {
  createContext,
  useContext,
  useReducer,
  useCallback,
  useState,
  type ReactNode,
  type Dispatch,
} from "react";
import type { ProjectFile } from "../types";
import {
  projectReducer,
  createEmptyProject,
  type ProjectAction,
} from "./project-reducer";
import { openProject, saveProject, selectPdf } from "./file-io";
import { localFileUrl } from "./asset-url";
import { resolvePdfPath } from "./file-io";

interface ProjectState {
  project: ProjectFile;
  dispatch: Dispatch<ProjectAction>;
  filePath: string | null;
  pdfAbsolutePath: string | null;
  pdfUrl: string | null;
  dirty: boolean;
  selectedWaypointIndex: number;
  setSelectedWaypointIndex: (i: number) => void;
  doNew: () => void;
  doOpen: () => Promise<void>;
  doSave: () => Promise<void>;
  doSaveAs: () => Promise<void>;
  doSelectPdf: () => Promise<void>;
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

  const doNew = useCallback(() => {
    rawDispatch({ type: "LOAD_PROJECT", project: createEmptyProject() });
    setFilePath(null);
    setPdfAbsolutePath(null);
    setDirty(false);
    setSelectedWaypointIndex(0);
  }, []);

  const doOpen = useCallback(async () => {
    const result = await openProject();
    if (!result) return;
    rawDispatch({ type: "LOAD_PROJECT", project: result.project });
    setFilePath(result.filePath);
    setDirty(false);
    setSelectedWaypointIndex(0);

    if (result.project.pdfPath) {
      const abs = resolvePdfPath(result.filePath, result.project.pdfPath);
      updatePdfFromPath(abs);
    } else {
      updatePdfFromPath(null);
    }
  }, [updatePdfFromPath]);

  const doSave = useCallback(async () => {
    const path = await saveProject(project, filePath);
    if (path) {
      setFilePath(path);
      setDirty(false);
    }
  }, [project, filePath]);

  const doSaveAs = useCallback(async () => {
    const path = await saveProject(project, null);
    if (path) {
      setFilePath(path);
      setDirty(false);
    }
  }, [project]);

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
