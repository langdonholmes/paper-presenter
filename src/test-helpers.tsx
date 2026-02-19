import { type ReactNode } from "react";
import { vi } from "vitest";
import { render, type RenderOptions } from "@testing-library/react";
import { open, save, ask } from "@tauri-apps/plugin-dialog";
import { readTextFile, writeTextFile } from "@tauri-apps/plugin-fs";
import { ToastProvider } from "./lib/ToastContext";
import { ProjectProvider } from "./state/ProjectContext";

/** Wraps children in ToastProvider + ProjectProvider for testing editor components. */
export function EditorWrapper({ children }: { children: ReactNode }) {
  return (
    <ToastProvider>
      <ProjectProvider>{children}</ProjectProvider>
    </ToastProvider>
  );
}

export function renderWithProject(ui: React.ReactElement, options?: RenderOptions) {
  return render(ui, { wrapper: EditorWrapper, ...options });
}

/** Pre-typed references to globally-mocked Tauri dialog functions. */
export const mockDialog = {
  open: vi.mocked(open),
  save: vi.mocked(save),
  ask: vi.mocked(ask),
};

/** Pre-typed references to globally-mocked Tauri fs functions. */
export const mockFs = {
  readTextFile: vi.mocked(readTextFile),
  writeTextFile: vi.mocked(writeTextFile),
};
