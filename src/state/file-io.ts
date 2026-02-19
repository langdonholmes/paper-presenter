import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { open, save } from "@tauri-apps/plugin-dialog";
import type { ProjectFile } from "../types";

const FILE_FILTERS = [
  { name: "Paper Presenter Project", extensions: ["paperp.json"] },
];

const PDF_FILTERS = [{ name: "PDF Document", extensions: ["pdf"] }];

export async function openProject(): Promise<{
  project: ProjectFile;
  filePath: string;
} | null> {
  const path = await open({ filters: FILE_FILTERS, multiple: false });
  if (!path) return null;

  const text = await readTextFile(path);
  const project: ProjectFile = JSON.parse(text);
  return { project, filePath: path };
}

export async function saveProject(
  project: ProjectFile,
  filePath: string | null,
): Promise<string | null> {
  let targetPath = filePath;

  if (!targetPath) {
    const path = await save({
      filters: FILE_FILTERS,
      defaultPath: `${project.meta.title}.paperp.json`,
    });
    if (!path) return null;
    targetPath = path;
  }

  await writeTextFile(targetPath, JSON.stringify(project, null, 2));
  return targetPath;
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
