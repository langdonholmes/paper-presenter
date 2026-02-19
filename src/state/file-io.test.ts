import { describe, it, expect } from "vitest";
import { mockDialog, mockFs } from "../test-helpers";
import { isProjectFile, resolvePdfPath, openProject, saveProject, selectPdf } from "./file-io";
import type { ProjectFile } from "../types";

// ── isProjectFile ──

describe("isProjectFile", () => {
  const validProject = {
    version: 1,
    meta: { title: "Test", defaults: { sidebarWidth: "35%", sidebar: true } },
    pdfPath: "test.pdf",
    highlights: [],
    waypoints: [],
  };

  it("accepts a valid project", () => {
    expect(isProjectFile(validProject)).toBe(true);
  });

  it("accepts a project with populated arrays", () => {
    expect(
      isProjectFile({
        ...validProject,
        highlights: [{ id: "h1" }],
        waypoints: [{ id: "w1" }],
      }),
    ).toBe(true);
  });

  it("rejects null", () => {
    expect(isProjectFile(null)).toBe(false);
  });

  it("rejects undefined", () => {
    expect(isProjectFile(undefined)).toBe(false);
  });

  it("rejects a string", () => {
    expect(isProjectFile("not a project")).toBe(false);
  });

  it("rejects wrong version", () => {
    expect(isProjectFile({ ...validProject, version: 2 })).toBe(false);
  });

  it("rejects missing meta", () => {
    const { meta: _, ...noMeta } = validProject;
    expect(isProjectFile(noMeta)).toBe(false);
  });

  it("rejects missing highlights array", () => {
    const { highlights: _, ...noHL } = validProject;
    expect(isProjectFile(noHL)).toBe(false);
  });

  it("rejects missing waypoints array", () => {
    const { waypoints: _, ...noWP } = validProject;
    expect(isProjectFile(noWP)).toBe(false);
  });

  it("rejects highlights as non-array", () => {
    expect(isProjectFile({ ...validProject, highlights: "nope" })).toBe(false);
  });

  it("rejects an empty object", () => {
    expect(isProjectFile({})).toBe(false);
  });
});

// ── resolvePdfPath ──

describe("resolvePdfPath", () => {
  it("returns empty string for empty relative path", () => {
    expect(resolvePdfPath("/foo/bar/project.json", "")).toBe("");
  });

  it("returns absolute path as-is (unix)", () => {
    expect(resolvePdfPath("/foo/bar/project.json", "/abs/paper.pdf")).toBe(
      "/abs/paper.pdf",
    );
  });

  it("returns absolute path as-is (windows)", () => {
    expect(
      resolvePdfPath("C:\\Users\\project.json", "D:\\docs\\paper.pdf"),
    ).toBe("D:\\docs\\paper.pdf");
  });

  it("resolves relative path against project directory", () => {
    expect(resolvePdfPath("/home/user/project.paperp.json", "paper.pdf")).toBe(
      "/home/user/paper.pdf",
    );
  });

  it("handles nested relative paths", () => {
    expect(
      resolvePdfPath("/home/user/project.json", "pdfs/paper.pdf"),
    ).toBe("/home/user/pdfs/paper.pdf");
  });

  it("handles windows-style project paths with relative pdf", () => {
    expect(
      resolvePdfPath("C:\\Users\\docs\\project.json", "paper.pdf"),
    ).toBe("C:\\Users\\docs/paper.pdf");
  });
});

// ── openProject ──

const validProject: ProjectFile = {
  version: 1,
  meta: { title: "Test", defaults: { sidebarWidth: "35%", sidebar: true } },
  pdfPath: "test.pdf",
  highlights: [],
  waypoints: [],
};

describe("openProject", () => {
  it("returns null when dialog is cancelled", async () => {
    mockDialog.open.mockResolvedValueOnce(null);
    expect(await openProject()).toBeNull();
  });

  it("returns ok with project and path on success", async () => {
    mockDialog.open.mockResolvedValueOnce("/path/to/file.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    const result = await openProject();
    expect(result).toEqual({
      ok: true,
      value: { project: validProject, filePath: "/path/to/file.paperp.json" },
    });
  });

  it("returns error for invalid project file", async () => {
    mockDialog.open.mockResolvedValueOnce("/bad.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify({ not: "a project" }));
    const result = await openProject();
    expect(result).toEqual({ ok: false, error: "File is not a valid project" });
  });

  it("returns error on read failure", async () => {
    mockDialog.open.mockResolvedValueOnce("/missing.json");
    mockFs.readTextFile.mockRejectedValueOnce(new Error("ENOENT"));
    const result = await openProject();
    expect(result).toEqual({ ok: false, error: "Failed to open project: ENOENT" });
  });

  it("returns error on JSON parse failure", async () => {
    mockDialog.open.mockResolvedValueOnce("/corrupt.json");
    mockFs.readTextFile.mockResolvedValueOnce("{not valid json");
    const result = await openProject();
    expect(result?.ok).toBe(false);
  });
});

// ── saveProject ──

describe("saveProject", () => {
  it("returns null when dialog is cancelled (no filePath)", async () => {
    mockDialog.save.mockResolvedValueOnce(null);
    expect(await saveProject(validProject, null)).toBeNull();
  });

  it("skips dialog when filePath is provided", async () => {
    const result = await saveProject(validProject, "/existing.paperp.json");
    expect(mockDialog.save).not.toHaveBeenCalled();
    expect(result).toEqual({ ok: true, value: "/existing.paperp.json" });
  });

  it("prompts dialog and saves on success", async () => {
    mockDialog.save.mockResolvedValueOnce("/new.paperp.json");
    const result = await saveProject(validProject, null);
    expect(result).toEqual({ ok: true, value: "/new.paperp.json" });
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      "/new.paperp.json",
      JSON.stringify(validProject, null, 2),
    );
  });

  it("returns error on write failure", async () => {
    mockFs.writeTextFile.mockRejectedValueOnce(new Error("EACCES"));
    const result = await saveProject(validProject, "/readonly.json");
    expect(result).toEqual({ ok: false, error: "Failed to save project: EACCES" });
  });
});

// ── selectPdf ──

describe("selectPdf", () => {
  it("returns null when cancelled", async () => {
    mockDialog.open.mockResolvedValueOnce(null);
    expect(await selectPdf()).toBeNull();
  });

  it("returns selected path", async () => {
    mockDialog.open.mockResolvedValueOnce("/papers/paper.pdf");
    expect(await selectPdf()).toBe("/papers/paper.pdf");
  });
});
