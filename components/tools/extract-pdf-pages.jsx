"use client";
import PdfEdit from "./_pdf-edit";
import { parsePageList } from "../../lib/pdfPages";

export default function ExtractPdfPages() {
  return (
    <PdfEdit
      actionLabel="Extract pages"
      outSuffix="extracted"
      defaultOptions={{ sel: "" }}
      renderOptions={(count, o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="ep-sel">Pages to extract (e.g. 1-3, 8)</label>
          <input id="ep-sel" className="tool-input" type="text" value={o.sel} onChange={(e) => setOpt("sel", e.target.value)} disabled={busy} placeholder="1-3, 8" />
        </div>
      )}
      process={async (doc, o, count, PDFDocument) => {
        const pages = parsePageList(o.sel, count);
        if (pages.length === 0) throw new Error("Enter which pages to extract, e.g. 1-3.");
        const out = await PDFDocument.create();
        const copied = await out.copyPages(doc, pages.map((p) => p - 1));
        copied.forEach((pg) => out.addPage(pg));
        return out;
      }}
    />
  );
}
