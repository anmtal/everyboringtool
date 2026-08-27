"use client";
import PdfEdit from "./_pdf-edit";
import { parsePageList } from "../../lib/pdfPages";

export default function DeletePdfPages() {
  return (
    <PdfEdit
      actionLabel="Delete pages"
      outSuffix="pages-removed"
      defaultOptions={{ sel: "" }}
      renderOptions={(count, o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="dp-sel">Pages to delete (e.g. 2, 5-7)</label>
          <input id="dp-sel" className="tool-input" type="text" value={o.sel} onChange={(e) => setOpt("sel", e.target.value)} disabled={busy} placeholder="2, 5-7" />
        </div>
      )}
      process={async (doc, o, count) => {
        const pages = parsePageList(o.sel, count);
        if (pages.length === 0) throw new Error("Enter which pages to delete, e.g. 2, 5-7.");
        if (pages.length >= count) throw new Error("That would delete every page — leave at least one.");
        for (const p of [...pages].sort((a, b) => b - a)) doc.removePage(p - 1);
      }}
    />
  );
}
