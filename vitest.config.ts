import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "url";

export default defineConfig({
  resolve: {
    alias: {
      "react-pdf-highlighter-extended": fileURLToPath(
        new URL("src/__mocks__/react-pdf-highlighter-extended.ts", import.meta.url),
      ),
    },
  },
  test: {
    include: ["src/**/*.test.{ts,tsx}"],
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    css: false,
    coverage: {
      provider: "v8",
      include: ["src/**/*.{ts,tsx}"],
      exclude: [
        "src/**/*.test.{ts,tsx}",
        "src/test-setup.ts",
        "src/test-helpers.tsx",
        "src/main.tsx",
        "src/vite-env.d.ts",
        "src/lib/PdfViewer.tsx",
        "src/editor/MilkdownEditor.tsx",
        "src/__mocks__/**",
      ],
      thresholds: {
        statements: 70,
        branches: 65,
        functions: 70,
        lines: 70,
      },
      reporter: ["text", "json-summary"],
    },
  },
});
