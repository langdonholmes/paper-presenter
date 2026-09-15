import { save } from "@tauri-apps/plugin-dialog";
import { writeTextFile } from "@tauri-apps/plugin-fs";
import type { ProjectFile } from "../types";
import type { FileResult } from "../state/file-io";
import { buildDeckHtml, htmlPathFor } from "./deck-export";
import { inlinedKatexCss } from "./katex-assets";
import { figureCss } from "./figure-assets";

const HTML_FILTERS = [{ name: "HTML Document", extensions: ["html"] }];

export function renderDeck(project: ProjectFile): string {
  return buildDeckHtml(project, { katexCss: inlinedKatexCss, figureCss });
}

async function write(
  project: ProjectFile,
  path: string,
): Promise<FileResult<string>> {
  try {
    await writeTextFile(path, renderDeck(project));
    return { ok: true, value: path };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { ok: false, error: `Failed to export HTML: ${msg}` };
  }
}

/** Returns null if the user cancelled the dialog. */
export async function exportDeckHtml(
  project: ProjectFile,
  projectPath: string | null,
): Promise<FileResult<string> | null> {
  const path = await save({
    filters: HTML_FILTERS,
    defaultPath: projectPath
      ? htmlPathFor(projectPath)
      : `${project.meta.title || "presentation"}.html`,
  });
  if (!path) return null;
  return write(project, path);
}

/** The copy written beside the project file on every save. */
export function exportDeckBeside(
  project: ProjectFile,
  projectPath: string,
): Promise<FileResult<string>> {
  return write(project, htmlPathFor(projectPath));
}
