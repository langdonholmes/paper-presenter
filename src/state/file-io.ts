import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ProjectFile } from "../types";

const FILE_FILTERS = [
  { name: "Paper Presenter Project", extensions: ["paperp.json"] },
];

const PDF_FILTERS = [{ name: "PDF Document", extensions: ["pdf"] }];

export type FileResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: string };

export function isProjectFile(obj: unknown): obj is ProjectFile {
  if (!obj || typeof obj !== "object") return false;
  const p = obj as Record<string, unknown>;
  return (
    p.version === 1 &&
    typeof p.meta === "object" &&
    Array.isArray(p.highlights) &&
    Array.isArray(p.waypoints)
  );
}

export async function openProject(): Promise<FileResult<{
  project: ProjectFile;
  filePath: string;
}> | null> {
  const path = await open({ filters: FILE_FILTERS, multiple: false });
  if (!path) return null;

  try {
    const text = await readTextFile(path);
    const parsed: unknown = JSON.parse(text);

    if (!isProjectFile(parsed)) {
      return { ok: false, error: "File is not a valid project" };
    }

    return { ok: true, value: { project: parsed, filePath: path } };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to open project: ${msg}` };
  }
}

export async function saveProject(
  project: ProjectFile,
  filePath: string | null,
): Promise<FileResult<string> | null> {
  let targetPath = filePath;

  if (!targetPath) {
    const path = await save({
      filters: FILE_FILTERS,
      defaultPath: `${project.meta.title}.paperp.json`,
    });
    if (!path) return null;
    targetPath = path;
  }

  try {
    await writeTextFile(targetPath, JSON.stringify(project, null, 2));
    return { ok: true, value: targetPath };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to save project: ${msg}` };
  }
}

export async function selectPdf(): Promise<string | null> {
  const path = await open({ filters: PDF_FILTERS, multiple: false });
  return path ?? null;
}

export function resolvePdfPath(
  projectFilePath: string,
  relativePdfPath: string,
): string {
  if (!relativePdfPath) return "";
  // If the pdf path is already absolute, return as-is
  if (
    relativePdfPath.startsWith("/") ||
    relativePdfPath.match(/^[A-Z]:\\/i)
  ) {
    return relativePdfPath;
  }
  // Resolve relative to project file directory
  const dir = projectFilePath.substring(
    0,
    Math.max(
      projectFilePath.lastIndexOf("/"),
      projectFilePath.lastIndexOf("\\"),
    ),
  );
  return `${dir}/${relativePdfPath}`;
}
