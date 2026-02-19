import PdfViewer from "../lib/PdfViewer";
import type { PdfHighlight } from "../types";

interface Props {
  pdfUrl: string;
  highlights: PdfHighlight[];
  scrollToHighlightId: string | null;
}

export default function PresenterPdfView({
  pdfUrl,
  highlights,
  scrollToHighlightId,
}: Props) {
  return (
    <div className="presenter-pdf">
      <PdfViewer
        url={pdfUrl}
        highlights={highlights}
        scrollToHighlightId={scrollToHighlightId}
      />
    </div>
  );
}
