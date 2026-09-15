import themeCss from "../styles/theme.css?raw";
import ppFiguresCss from "../styles/pp-figures.css?raw";

/**
 * The app's `:root` custom properties, re-scoped to figures in the export.
 *
 * Read out of theme.css rather than copied so the palette cannot drift, and
 * taken whole rather than cherry-picked because waypoint HTML sets `--pp-hue`
 * to arbitrary palette entries inline.
 */
function rootBlock(css: string): string {
  const open = css.indexOf(":root");
  const brace = css.indexOf("{", open);
  if (open === -1 || brace === -1) return "";
  let depth = 0;
  for (let i = brace; i < css.length; i++) {
    if (css[i] === "{") depth++;
    else if (css[i] === "}" && --depth === 0) {
      return css.slice(brace + 1, i);
    }
  }
  return "";
}

/**
 * The pp-* figures render against the dark palette they were designed for,
 * as an island in the otherwise light document.
 *
 * Re-theming them for light would mean inventing a second contract that only
 * the export used, and so only the export could break — the app would never
 * exercise it. Keeping the figures on their own dark surface reuses the one
 * set of values the presenter already proves every time it runs.
 */
export const figureCss: string = `
.pp-fig {
${rootBlock(themeCss)}
  background: var(--ctp-mantle);
  padding: 14px 16px 12px;
  border-radius: 8px;
  /* The figures carry meaning in their fills, so they have to survive a print
     with background graphics switched off. */
  print-color-adjust: exact;
  -webkit-print-color-adjust: exact;
}
${ppFiguresCss}
`;
