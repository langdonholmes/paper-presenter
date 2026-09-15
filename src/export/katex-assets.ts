import katexCss from "katex/dist/katex.min.css?raw";

/**
 * KaTeX's woff2 files as data URIs, keyed by filename.
 *
 * Resolved by Vite at build time, so a packaging problem surfaces when the app
 * is built rather than when someone reaches for their backup.
 */
const fontModules = import.meta.glob(
  "/node_modules/katex/dist/fonts/*.woff2",
  { query: "?inline", eager: true, import: "default" },
) as Record<string, string>;

const fontsByName = new Map(
  Object.entries(fontModules).map(([path, dataUri]) => [
    path.slice(path.lastIndexOf("/") + 1),
    dataUri,
  ]),
);

/**
 * KaTeX's stylesheet with every font embedded, so an exported deck renders
 * maths on a machine with no network and no KaTeX install.
 *
 * Only the woff2 sources survive the rewrite. The woff and truetype fallbacks
 * exist for browsers that predate woff2 by a decade, and carrying all three as
 * base64 would triple the weight of every export to serve a browser that
 * cannot be the one opening it.
 *
 * A font Vite didn't resolve keeps its original relative `url(...)`, which
 * simply fails to load and drops KaTeX to fallback glyphs — degraded maths
 * beats an export that refuses to be written.
 */
export const inlinedKatexCss: string = katexCss.replace(
  /src:url\(fonts\/([\w-]+\.woff2)\) format\("woff2"\)[^;}]*/g,
  (whole, file: string) => {
    const dataUri = fontsByName.get(file);
    return dataUri ? `src:url(${dataUri}) format("woff2")` : whole;
  },
);
