import { useRef, useState } from "react";
import PdfViewer from "../lib/PdfViewer";
import type { ZoomApi, ZoomValue } from "../lib/zoom";
import type { PdfHighlight, ScrollAlign } from "../types";
import ZoomOverlay from "./ZoomOverlay";

interface Props {
  pdfUrl: string;
  highlights: PdfHighlight[];
  scrollToHighlightId: string | null;
  scrollAlign?: ScrollAlign;
}

export default function PresenterPdfView({
  pdfUrl,
  highlights,
  scrollToHighlightId,
  scrollAlign,
}: Props) {
  const zoomApi = useRef<ZoomApi | null>(null);
  const [zoom, setZoom] = useState<ZoomValue>("auto");

  return (
    <div className="presenter-pdf">
      <PdfViewer
        url={pdfUrl}
        highlights={highlights}
        scrollToHighlightId={scrollToHighlightId}
        scrollAlign={scrollAlign}
        activeHighlightId={scrollToHighlightId}
        inactiveHighlights="hide"
        onZoomChange={setZoom}
        zoomApiRef={(api) => {
          zoomApi.current = api;
        }}
      />
      <ZoomOverlay
        zoom={zoom}
        onZoomIn={() => zoomApi.current?.zoomIn()}
        onZoomOut={() => zoomApi.current?.zoomOut()}
        onReset={() => zoomApi.current?.reset()}
      />
    </div>
  );
}
