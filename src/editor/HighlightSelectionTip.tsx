import { useState } from "react";
import { HL_PALETTE, HL_DEFAULT_COLOR, type HighlightColor } from "../types";

interface Props {
  onAdd: (label: string, color: HighlightColor) => void;
}

const COLORS = Object.keys(HL_PALETTE) as HighlightColor[];

export default function HighlightSelectionTip({ onAdd }: Props) {
  const [label, setLabel] = useState("");
  const [color, setColor] = useState<HighlightColor>(HL_DEFAULT_COLOR);

  return (
    <div
      style={{
        background: "var(--ctp-surface0, #313244)",
        border: "1px solid var(--ctp-surface1, #45475a)",
        borderRadius: 6,
        padding: 8,
        display: "flex",
        flexDirection: "column",
        gap: 6,
        minWidth: 180,
      }}
    >
      <input
        type="text"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) onAdd(label.trim(), color);
        }}
        style={{
          padding: "4px 6px",
          border: "1px solid var(--ctp-surface1, #45475a)",
          borderRadius: 4,
          background: "var(--ctp-base, #1e1e2e)",
          color: "var(--ctp-text, #cdd6f4)",
          fontSize: 13,
        }}
      />
      <div style={{ display: "flex", gap: 4 }}>
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => setColor(c)}
            style={{
              width: 18,
              height: 18,
              borderRadius: "50%",
              border:
                c === color
                  ? "2px solid var(--ctp-text, #cdd6f4)"
                  : "2px solid transparent",
              background: `rgb(${HL_PALETTE[c]})`,
              cursor: "pointer",
              padding: 0,
            }}
          />
        ))}
      </div>
      <button
        disabled={!label.trim()}
        onClick={() => label.trim() && onAdd(label.trim(), color)}
        style={{
          padding: "4px 8px",
          borderRadius: 4,
          border: "none",
          background: "var(--accent, #89b4fa)",
          color: "var(--ctp-crust, #11111b)",
          fontWeight: 600,
          fontSize: 12,
          cursor: label.trim() ? "pointer" : "default",
          opacity: label.trim() ? 1 : 0.5,
        }}
      >
        Add Highlight
      </button>
    </div>
  );
}
