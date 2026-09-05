"use client";
import PdfEdit from "./_pdf-edit";

export default function CropPdf() {
  return (
    <PdfEdit
      actionLabel="Crop PDF"
      outSuffix="cropped"
      defaultOptions={{ margin: "36" }}
      note={<p className="tool-note">Margin is in points (72 points = 1 inch). The same amount is trimmed from all four sides of every page.</p>}
      renderOptions={(count, o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="cp-m">Trim from each side: {o.margin} pt</label>
          <input id="cp-m" type="range" min="0" max="144" step="6" value={o.margin} onChange={(e) => setOpt("margin", e.target.value)} disabled={busy} />
        </div>
      )}
      process={async (doc, o) => {
        const m = Math.max(0, parseInt(o.margin, 10) || 0);
        if (m === 0) throw new Error("Set a margin greater than 0 to crop.");
        for (const page of doc.getPages()) {
          // Crop relative to the page's visible box, not an assumed (0,0)-origin MediaBox:
          // getCropBox() falls back to the MediaBox when no CropBox is set, and a page
          // that already has a CropBox (or a non-zero origin) must be trimmed from that.
          const base = page.getCropBox();
          // Clamp so the resulting box keeps at least 1pt of width and height.
          const limit = Math.max(0, Math.floor((Math.min(base.width, base.height) - 1) / 2));
          const mm = Math.min(m, limit);
          if (mm > 0) {
            page.setCropBox(base.x + mm, base.y + mm, base.width - 2 * mm, base.height - 2 * mm);
          }
        }
      }}
    />
  );
}
