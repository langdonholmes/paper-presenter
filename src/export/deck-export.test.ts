import { describe, it, expect } from "vitest";
import {
  basename,
  buildDeckHtml,
  escapeHtml,
  htmlPathFor,
  waypointPage,
} from "./deck-export";
import type { PdfHighlight, ProjectFile, Waypoint } from "../types";

function waypoint(overrides: Partial<Waypoint> = {}): Waypoint {
  return {
    id: "wp1",
    title: "A waypoint",
    content: "Some content",
    notes: "Private speaker notes",
    page: null,
    scrollY: null,
    highlightRef: null,
    color: null,
    sidebarWidth: "38%",
    sidebar: true,
    scrollAlign: "center",
    ...overrides,
  };
}

function highlight(id: string, pageNumber: number): PdfHighlight {
  return {
    id,
    label: `highlight ${id}`,
    position: {
      boundingRect: { x1: 0, y1: 0, x2: 1, y2: 1, width: 10, height: 10, pageNumber },
      rects: [],
    },
    content: { text: "quoted" },
    color: "yellow",
  };
}

function project(overrides: Partial<ProjectFile> = {}): ProjectFile {
  return {
    version: 1,
    meta: { title: "My deck", defaults: { sidebarWidth: "38%", sidebar: true } },
    pdfPath: "/papers/huang-2023.pdf",
    highlights: [],
    waypoints: [waypoint()],
    ...overrides,
  };
}

const AT = new Date("2026-09-15T12:00:00Z");

describe("waypointPage", () => {
  it("prefers the waypoint's own page", () => {
    const wp = waypoint({ page: 4, highlightRef: "h1" });
    expect(waypointPage(wp, [highlight("h1", 9)])).toBe(4);
  });

  it("falls back to the referenced highlight's page", () => {
    const wp = waypoint({ page: null, highlightRef: "h1" });
    expect(waypointPage(wp, [highlight("h1", 9)])).toBe(9);
  });

  it("returns null with no page and no highlight", () => {
    expect(waypointPage(waypoint(), [])).toBeNull();
  });

  it("returns null when the referenced highlight is missing", () => {
    const wp = waypoint({ highlightRef: "gone" });
    expect(waypointPage(wp, [highlight("h1", 9)])).toBeNull();
  });

  it("keeps page zero rather than treating it as absent", () => {
    expect(waypointPage(waypoint({ page: 0 }), [])).toBe(0);
  });
});

describe("basename", () => {
  it("handles posix paths", () => {
    expect(basename("/a/b/paper.pdf")).toBe("paper.pdf");
  });

  it("handles windows paths", () => {
    expect(basename("C:\\docs\\paper.pdf")).toBe("paper.pdf");
  });

  it("returns a bare filename unchanged", () => {
    expect(basename("paper.pdf")).toBe("paper.pdf");
  });
});

describe("escapeHtml", () => {
  it("escapes markup characters", () => {
    expect(escapeHtml(`<a href="x">&`)).toBe("&lt;a href=&quot;x&quot;&gt;&amp;");
  });
});

describe("buildDeckHtml", () => {
  it("renders one section per waypoint, numbered against the total", () => {
    const html = buildDeckHtml(
      project({
        waypoints: [
          waypoint({ id: "a", title: "First" }),
          waypoint({ id: "b", title: "Second" }),
        ],
      }),
      { generatedAt: AT },
    );
    expect(html).toContain('id="wp-1"');
    expect(html).toContain('id="wp-2"');
    expect(html).toContain("1 / 2");
    expect(html).toContain("2 / 2");
    expect(html).toContain("First");
    expect(html).toContain("Second");
  });

  it("numbers content-less waypoints alongside the rest", () => {
    const html = buildDeckHtml(
      project({
        waypoints: [
          waypoint({ id: "a", content: "" }),
          waypoint({ id: "b", title: "After the gap" }),
        ],
      }),
      { generatedAt: AT },
    );
    expect(html).toContain("wp-empty");
    expect(html).toContain("2 / 2");
  });

  it("shows the page a waypoint lands on", () => {
    const html = buildDeckHtml(
      project({
        highlights: [highlight("h1", 9)],
        waypoints: [waypoint({ highlightRef: "h1" })],
      }),
      { generatedAt: AT },
    );
    expect(html).toContain("p.&nbsp;9");
  });

  it("omits the page tag when there is no page to show", () => {
    const html = buildDeckHtml(project(), { generatedAt: AT });
    const body = html.slice(html.indexOf("<body>"));
    expect(body).not.toContain("wp-page");
  });

  it("renders markdown content", () => {
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ content: "- one\n- two" })] }),
      { generatedAt: AT },
    );
    expect(html).toContain("<li>one</li>");
  });

  it("never carries speaker notes into the export", () => {
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ notes: "DO NOT SHOW THIS" })] }),
      { generatedAt: AT },
    );
    expect(html).not.toContain("DO NOT SHOW THIS");
  });

  it("escapes titles rather than trusting them as markup", () => {
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ title: "<script>x</script>" })] }),
      { generatedAt: AT },
    );
    expect(html).not.toContain("<script>x</script>");
    expect(html).toContain("&lt;script&gt;");
  });

  it("puts the source pdf in the head but not the body", () => {
    const html = buildDeckHtml(project(), { generatedAt: AT });
    expect(html).toContain('<title>My deck — huang-2023.pdf</title>');
    expect(html).toContain('name="source-pdf" content="huang-2023.pdf"');
    const body = html.slice(html.indexOf("<body>"));
    expect(body).not.toContain("huang-2023.pdf");
  });

  it("titles the document with the deck alone when no pdf is set", () => {
    const html = buildDeckHtml(project({ pdfPath: "" }), { generatedAt: AT });
    expect(html).toContain("<title>My deck</title>");
  });

  it("falls back to a placeholder deck title", () => {
    const html = buildDeckHtml(
      project({
        meta: { title: "", defaults: { sidebarWidth: "38%", sidebar: true } },
      }),
      { generatedAt: AT },
    );
    expect(html).toContain("Untitled presentation");
  });

  it("falls back to a placeholder waypoint title", () => {
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ title: "" })] }),
      { generatedAt: AT },
    );
    expect(html).toContain("Untitled");
  });

  it("is standalone: no scripts and no external references", () => {
    const html = buildDeckHtml(project(), { generatedAt: AT });
    expect(html).not.toMatch(/<script/i);
    expect(html).not.toMatch(/<link\b/i);
    expect(html).not.toMatch(/https?:\/\//i);
  });

  it("omits the katex stylesheet when the deck has no maths", () => {
    const html = buildDeckHtml(project(), {
      katexCss: ".katex{color:red}",
      generatedAt: AT,
    });
    expect(html).not.toContain(".katex{color:red}");
  });

  it("includes the katex stylesheet when the deck renders maths", () => {
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ content: "$x^2$" })] }),
      { katexCss: ".katex{color:red}", generatedAt: AT },
    );
    expect(html).toContain(".katex{color:red}");
  });

  it("omits the figure styles when no waypoint embeds a figure", () => {
    const html = buildDeckHtml(project(), {
      figureCss: ".pp-fig{outline:1px solid red}",
      generatedAt: AT,
    });
    expect(html).not.toContain(".pp-fig{outline:1px solid red}");
  });

  it("includes the figure styles when a waypoint embeds one", () => {
    const html = buildDeckHtml(
      project({
        waypoints: [
          waypoint({ content: "<div class='pp-fig'><span class='pp-tag'>x</span></div>" }),
        ],
      }),
      { figureCss: ".pp-fig{outline:1px solid red}", generatedAt: AT },
    );
    expect(html).toContain(".pp-fig{outline:1px solid red}");
  });

  it("passes embedded figure markup through untouched", () => {
    const markup = "<div class='pp-fig'><span class='pp-cell pp-cell--mask'></span></div>";
    const html = buildDeckHtml(
      project({ waypoints: [waypoint({ content: markup })] }),
      { generatedAt: AT },
    );
    expect(html).toContain("pp-cell--mask");
  });

  it("breaks each waypoint onto its own printed page", () => {
    const html = buildDeckHtml(project(), { generatedAt: AT });
    expect(html).toContain("@media print");
    expect(html).toContain("page-break-after: always");
  });

  it("stamps the export date", () => {
    const html = buildDeckHtml(project(), { generatedAt: AT });
    expect(html).toContain("2026-09-15");
  });

  it("pluralises the waypoint count", () => {
    expect(buildDeckHtml(project(), { generatedAt: AT })).toContain("1 waypoint ");
    expect(
      buildDeckHtml(
        project({ waypoints: [waypoint({ id: "a" }), waypoint({ id: "b" })] }),
        { generatedAt: AT },
      ),
    ).toContain("2 waypoints ");
  });

  it("handles an empty deck", () => {
    const html = buildDeckHtml(project({ waypoints: [] }), { generatedAt: AT });
    expect(html).toContain("0 waypoints");
    expect(html).not.toContain("class=\"wp\"");
  });

  it("defaults the date to now when none is given", () => {
    expect(buildDeckHtml(project())).toContain("exported ");
  });
});

describe("htmlPathFor", () => {
  it("replaces the compound project extension", () => {
    expect(htmlPathFor("/a/talk.paperp.json")).toBe("/a/talk.html");
  });

  it("replaces a plain json extension", () => {
    expect(htmlPathFor("/a/talk.json")).toBe("/a/talk.html");
  });

  it("appends when there is no recognised extension", () => {
    expect(htmlPathFor("/a/talk")).toBe("/a/talk.html");
  });

  it("leaves dots elsewhere in the path alone", () => {
    expect(htmlPathFor("/a.b/talk.paperp.json")).toBe("/a.b/talk.html");
  });
});
