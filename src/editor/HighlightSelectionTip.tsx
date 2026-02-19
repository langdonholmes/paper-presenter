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
    <div className="hl-tip">
      <input
        className="hl-tip-input"
        type="text"
        placeholder="Label"
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        autoFocus
        onKeyDown={(e) => {
          if (e.key === "Enter" && label.trim()) onAdd(label.trim(), color);
        }}
      />
      <div className="hl-tip-colors">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => setColor(c)}
            className={`hl-tip-swatch${c === color ? " active" : ""}`}
            style={{ background: `rgb(${HL_PALETTE[c]})` }}
          />
        ))}
      </div>
      <button
        className="hl-tip-add"
        disabled={!label.trim()}
        onClick={() => label.trim() && onAdd(label.trim(), color)}
      >
        Add Highlight
      </button>
    </div>
  );
}
