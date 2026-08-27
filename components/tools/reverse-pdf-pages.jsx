"use client";
import PdfEdit from "./_pdf-edit";

export default function ReversePdfPages() {
  return (
    <PdfEdit
      actionLabel="Reverse page order"
      outSuffix="reversed"
      process={async (doc, o, count, PDFDocument) => {
        const out = await PDFDocument.create();
        const idx = [];
        for (let i = count - 1; i >= 0; i--) idx.push(i);
        const pages = await out.copyPages(doc, idx);
        pages.forEach((p) => out.addPage(p));
        return out;
      }}
    />
  );
}
