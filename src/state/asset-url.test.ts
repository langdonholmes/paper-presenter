import { describe, it, expect, vi } from "vitest";

vi.mock("@tauri-apps/api/core", () => ({
  convertFileSrc: vi.fn((path: string) => `asset://localhost/${encodeURIComponent(path)}`),
}));

import { convertFileSrc } from "@tauri-apps/api/core";
import { localFileUrl } from "./asset-url";

describe("localFileUrl", () => {
  it("delegates to convertFileSrc", () => {
    const result = localFileUrl("/Users/test/doc.pdf");
    expect(convertFileSrc).toHaveBeenCalledWith("/Users/test/doc.pdf");
    expect(typeof result).toBe("string");
  });

  it("returns the value from convertFileSrc", () => {
    const result = localFileUrl("/path/to/file.pdf");
    expect(result).toContain("asset://localhost/");
  });
});
