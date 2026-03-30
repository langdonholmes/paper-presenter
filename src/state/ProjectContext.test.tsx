import { describe, it, expect, vi } from "vitest";
import { render, screen, act, renderHook } from "@testing-library/react";
import { mockDialog, mockFs, EditorWrapper } from "../test-helpers";
import { useProject } from "./ProjectContext";
import type { ProjectFile } from "../types";

const validProject: ProjectFile = {
  version: 1,
  meta: { title: "Test", defaults: { sidebarWidth: "35%", sidebar: true } },
  pdfPath: "paper.pdf",
  highlights: [],
  waypoints: [
    {
      id: "w1",
      title: "First",
      content: "",
      notes: "",
      page: null,
      scrollY: null,
      highlightRef: null,
      color: null,
      sidebarWidth: "35%",
      sidebar: true,
      scrollAlign: "center",
    },
  ],
};

/** Harness that exposes context values via testids and buttons. */
function ContextHarness() {
  const ctx = useProject();
  return (
    <div>
      <span data-testid="dirty">{String(ctx.dirty)}</span>
      <span data-testid="filePath">{ctx.filePath ?? "null"}</span>
      <span data-testid="pdfUrl">{ctx.pdfUrl ?? "null"}</span>
      <span data-testid="title">{ctx.project.meta.title}</span>
      <span data-testid="waypointCount">{ctx.project.waypoints.length}</span>
      <span data-testid="selectedIndex">{ctx.selectedWaypointIndex}</span>
      <button data-testid="dispatch-set-meta" onClick={() => ctx.dispatch({ type: "SET_META", title: "Changed" })}>
        setMeta
      </button>
      <button data-testid="do-new" onClick={() => ctx.doNew()}>doNew</button>
      <button data-testid="do-open" onClick={() => ctx.doOpen()}>doOpen</button>
      <button data-testid="do-save" onClick={() => ctx.doSave()}>doSave</button>
      <button data-testid="do-save-as" onClick={() => ctx.doSaveAs()}>doSaveAs</button>
      <button data-testid="do-select-pdf" onClick={() => ctx.doSelectPdf()}>doSelectPdf</button>
    </div>
  );
}

function renderHarness() {
  return render(
    <EditorWrapper>
      <ContextHarness />
    </EditorWrapper>,
  );
}

// ── dispatch wrapper ──

describe("dispatch wrapper", () => {
  it("sets dirty=true for non-LOAD_PROJECT actions", async () => {
    renderHarness();
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    await act(async () => {
      screen.getByTestId("dispatch-set-meta").click();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("true");
  });

  it("does not set dirty for LOAD_PROJECT (via doNew)", async () => {
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-new").click();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });
});

// ── guardDirty via doNew ──

describe("guardDirty", () => {
  it("skips dialog when not dirty", async () => {
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-new").click();
    });
    expect(mockDialog.ask).not.toHaveBeenCalled();
  });

  it("shows dialog when dirty and proceeds on confirm", async () => {
    mockDialog.ask.mockResolvedValueOnce(true);
    renderHarness();
    // Make dirty
    await act(async () => {
      screen.getByTestId("dispatch-set-meta").click();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("true");
    // doNew triggers guardDirty
    await act(async () => {
      screen.getByTestId("do-new").click();
    });
    expect(mockDialog.ask).toHaveBeenCalled();
    expect(screen.getByTestId("dirty").textContent).toBe("false");
  });

  it("cancels operation when user declines", async () => {
    mockDialog.ask.mockResolvedValueOnce(false);
    renderHarness();
    await act(async () => {
      screen.getByTestId("dispatch-set-meta").click();
    });
    await act(async () => {
      screen.getByTestId("do-new").click();
    });
    // Still dirty, title unchanged from SET_META
    expect(screen.getByTestId("dirty").textContent).toBe("true");
    expect(screen.getByTestId("title").textContent).toBe("Changed");
  });
});

// ── doNew ──

describe("doNew", () => {
  it("resets state", async () => {
    renderHarness();
    // Make dirty with a title change
    await act(async () => {
      screen.getByTestId("dispatch-set-meta").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Changed");
    await act(async () => {
      screen.getByTestId("do-new").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Untitled");
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    expect(screen.getByTestId("filePath").textContent).toBe("null");
    expect(screen.getByTestId("selectedIndex").textContent).toBe("0");
  });
});

// ── doOpen ──

describe("doOpen", () => {
  it("loads project on success", async () => {
    mockDialog.open.mockResolvedValueOnce("/path/to/file.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Test");
    expect(screen.getByTestId("filePath").textContent).toBe("/path/to/file.paperp.json");
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    expect(screen.getByTestId("waypointCount").textContent).toBe("1");
  });

  it("sets pdfUrl when project has pdfPath", async () => {
    mockDialog.open.mockResolvedValueOnce("/path/to/file.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    // validProject has pdfPath: "paper.pdf", so pdfUrl should be set
    expect(screen.getByTestId("pdfUrl").textContent).not.toBe("null");
  });

  it("clears pdfUrl when project has no pdfPath", async () => {
    const noPdfProject = { ...validProject, pdfPath: "" };
    mockDialog.open.mockResolvedValueOnce("/path/to/file.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(noPdfProject));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    expect(screen.getByTestId("pdfUrl").textContent).toBe("null");
  });

  it("does nothing when dialog is cancelled", async () => {
    mockDialog.open.mockResolvedValueOnce(null);
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Untitled");
  });

  it("shows error toast for invalid file", async () => {
    mockDialog.open.mockResolvedValueOnce("/bad.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify({ not: "valid" }));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    // Title unchanged
    expect(screen.getByTestId("title").textContent).toBe("Untitled");
    // Error toast rendered
    expect(screen.getByText("File is not a valid project")).toBeInTheDocument();
  });

  it("shows error toast for read failure", async () => {
    mockDialog.open.mockResolvedValueOnce("/missing.json");
    mockFs.readTextFile.mockRejectedValueOnce(new Error("ENOENT"));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    expect(screen.getByText(/Failed to open project/)).toBeInTheDocument();
  });
});

// ── doSave ──

describe("doSave", () => {
  it("writes without dialog when filePath exists", async () => {
    // Open a project to set filePath
    mockDialog.open.mockResolvedValueOnce("/existing.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    // Now save
    await act(async () => {
      screen.getByTestId("do-save").click();
    });
    expect(mockDialog.save).not.toHaveBeenCalled();
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      "/existing.paperp.json",
      expect.any(String),
    );
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    expect(screen.getByText("Project saved")).toBeInTheDocument();
  });

  it("prompts dialog when no filePath", async () => {
    mockDialog.save.mockResolvedValueOnce("/new.paperp.json");
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-save").click();
    });
    expect(mockDialog.save).toHaveBeenCalled();
    expect(screen.getByTestId("filePath").textContent).toBe("/new.paperp.json");
  });

  it("does nothing when save dialog is cancelled", async () => {
    mockDialog.save.mockResolvedValueOnce(null);
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-save").click();
    });
    expect(screen.getByTestId("filePath").textContent).toBe("null");
  });

  it("shows error toast on write failure", async () => {
    mockFs.writeTextFile.mockRejectedValueOnce(new Error("EACCES"));
    renderHarness();
    // Need a filePath to skip dialog
    mockDialog.open.mockResolvedValueOnce("/exists.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    await act(async () => {
      screen.getByTestId("do-save").click();
    });
    expect(screen.getByText(/Failed to save project/)).toBeInTheDocument();
  });
});

// ── doSaveAs ──

describe("doSaveAs", () => {
  it("always prompts dialog and sets filePath on success", async () => {
    mockDialog.save.mockResolvedValueOnce("/save-as.paperp.json");
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-save-as").click();
    });
    expect(mockDialog.save).toHaveBeenCalled();
    expect(screen.getByTestId("filePath").textContent).toBe("/save-as.paperp.json");
    expect(screen.getByText("Project saved")).toBeInTheDocument();
  });
});

// ── doSaveAs error ──

describe("doSaveAs error", () => {
  it("shows error toast on write failure", async () => {
    mockDialog.save.mockResolvedValueOnce("/save-as.paperp.json");
    mockFs.writeTextFile.mockRejectedValueOnce(new Error("EACCES"));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-save-as").click();
    });
    expect(screen.getByText(/Failed to save project/)).toBeInTheDocument();
  });
});

// ── doSelectPdf ──

describe("doSelectPdf", () => {
  it("sets pdfUrl and marks dirty", async () => {
    mockDialog.open.mockResolvedValueOnce("/papers/paper.pdf");
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-select-pdf").click();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("true");
    // pdfUrl should contain the asset URL
    expect(screen.getByTestId("pdfUrl").textContent).not.toBe("null");
  });

  it("does nothing when dialog is cancelled", async () => {
    mockDialog.open.mockResolvedValueOnce(null);
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-select-pdf").click();
    });
    expect(screen.getByTestId("dirty").textContent).toBe("false");
    expect(screen.getByTestId("pdfUrl").textContent).toBe("null");
  });
});

// ── open → edit → save round-trip ──

describe("open → edit → save round-trip", () => {
  it("modifications are persisted in the saved JSON", async () => {
    // Open a project
    mockDialog.open.mockResolvedValueOnce("/path/to/file.paperp.json");
    mockFs.readTextFile.mockResolvedValueOnce(JSON.stringify(validProject));
    renderHarness();
    await act(async () => {
      screen.getByTestId("do-open").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Test");

    // Modify the title
    await act(async () => {
      screen.getByTestId("dispatch-set-meta").click();
    });
    expect(screen.getByTestId("title").textContent).toBe("Changed");
    expect(screen.getByTestId("dirty").textContent).toBe("true");

    // Save — should write to the same filePath without prompting
    await act(async () => {
      screen.getByTestId("do-save").click();
    });
    expect(mockDialog.save).not.toHaveBeenCalled();
    expect(mockFs.writeTextFile).toHaveBeenCalledWith(
      "/path/to/file.paperp.json",
      expect.any(String),
    );

    // Verify the written JSON contains the modified title
    const writtenJson = mockFs.writeTextFile.mock.calls[0][1] as string;
    const savedProject = JSON.parse(writtenJson) as ProjectFile;
    expect(savedProject.meta.title).toBe("Changed");
    expect(savedProject.waypoints).toHaveLength(1);
    expect(savedProject.waypoints[0].title).toBe("First");
  });
});

// ── useProject outside provider ──

describe("useProject", () => {
  it("throws when used outside ProjectProvider", () => {
    // Suppress console.error from React for the expected error
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    expect(() => {
      renderHook(() => useProject());
    }).toThrow("useProject must be used within a ProjectProvider");
    spy.mockRestore();
  });
});
