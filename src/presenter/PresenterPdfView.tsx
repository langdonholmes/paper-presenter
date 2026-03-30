import PdfViewer from "../lib/PdfViewer";
import type { PdfHighlight, ScrollAlign } from "../types";

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
  return (
    <div className="presenter-pdf">
      <PdfViewer
        url={pdfUrl}
        highlights={highlights}
        scrollToHighlightId={scrollToHighlightId}
        scrollAlign={scrollAlign}
      />
    </div>
  );
}
