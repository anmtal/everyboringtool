"use client";
import PdfEdit from "./_pdf-edit";
import { rgb, StandardFonts } from "pdf-lib";

function hexToRgb(hex) {
  const m = /^#?([0-9a-f]{6})$/i.exec(hex || "");
  if (!m) return { r: 0, g: 0, b: 0 };
  const n = parseInt(m[1], 16);
  return { r: ((n >> 16) & 255) / 255, g: ((n >> 8) & 255) / 255, b: (n & 255) / 255 };
}

const POSITIONS = ["top-left", "top-center", "top-right", "center", "bottom-left", "bottom-center", "bottom-right"];

export default function AddTextToPdf() {
  return (
    <PdfEdit
      actionLabel="Add text"
      outSuffix="with-text"
      defaultOptions={{ text: "", page: "1", position: "bottom-center", size: "24", color: "#000000" }}
      renderOptions={(count, o, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="at-text">Text to add</label>
            <input id="at-text" className="tool-input" type="text" value={o.text} onChange={(e) => setOpt("text", e.target.value)} disabled={busy} placeholder="e.g. CONFIDENTIAL" />
          </div>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-page">Page (1–{count})</label>
              <input id="at-page" className="tool-input" type="number" min="1" max={count} value={o.page} onChange={(e) => setOpt("page", e.target.value)} disabled={busy} />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-pos">Position</label>
              <select id="at-pos" className="tool-select" value={o.position} onChange={(e) => setOpt("position", e.target.value)} disabled={busy}>
                {POSITIONS.map((p) => <option key={p} value={p}>{p.replace("-", " ")}</option>)}
              </select>
            </div>
          </div>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-size">Size: {o.size}pt</label>
              <input id="at-size" type="range" min="8" max="72" step="2" value={o.size} onChange={(e) => setOpt("size", e.target.value)} disabled={busy} />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-color">Color</label>
              <input id="at-color" type="color" value={o.color} onChange={(e) => setOpt("color", e.target.value)} disabled={busy} />
            </div>
          </div>
        </>
      )}
      process={async (doc, o, count) => {
        const text = (o.text || "").trim();
        if (!text) throw new Error("Type the text you want to add.");
        const pageNum = Math.min(Math.max(parseInt(o.page, 10) || 1, 1), count);
        const page = doc.getPage(pageNum - 1);
        const { width, height } = page.getSize();
        const font = await doc.embedFont(StandardFonts.Helvetica);
        const size = parseInt(o.size, 10) || 24;
        const tw = font.widthOfTextAtSize(text, size);
        const th = font.heightAtSize(size);
        const pad = 24;
        const pos = o.position === "center" ? "center-center" : o.position;
        const [v, h] = pos.split("-");
        const x = h === "left" ? pad : h === "right" ? Math.max(pad, width - tw - pad) : (width - tw) / 2;
        const y = v === "top" ? height - th - pad : v === "bottom" ? pad : (height - th) / 2;
        const c = hexToRgb(o.color);
        page.drawText(text, { x, y, size, font, color: rgb(c.r, c.g, c.b) });
      }}
    />
  );
}
