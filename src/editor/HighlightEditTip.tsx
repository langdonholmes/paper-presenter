import { useState } from "react";
import { HL_PALETTE, type HighlightColor, type PdfHighlight } from "../types";

interface Props {
  highlight: PdfHighlight;
  onUpdate: (id: string, patch: Partial<Omit<PdfHighlight, "id">>) => void;
  onDelete: (id: string) => void;
}

const COLORS = Object.keys(HL_PALETTE) as HighlightColor[];

export default function HighlightEditTip({
  highlight,
  onUpdate,
  onDelete,
}: Props) {
  const [label, setLabel] = useState(highlight.label);

  return (
    <div className="hl-tip">
      <input
        className="hl-tip-input"
        type="text"
        value={label}
        onChange={(e) => {
          setLabel(e.target.value);
          onUpdate(highlight.id, { label: e.target.value });
        }}
        autoFocus
      />
      <div className="hl-tip-colors">
        {COLORS.map((c) => (
          <button
            key={c}
            title={c}
            onClick={() => onUpdate(highlight.id, { color: c })}
            className={`hl-tip-swatch${c === highlight.color ? " active" : ""}`}
            style={{ background: `rgb(${HL_PALETTE[c]})` }}
          />
        ))}
      </div>
      <button className="hl-tip-delete" onClick={() => onDelete(highlight.id)}>
        Delete
      </button>
    </div>
  );
}
