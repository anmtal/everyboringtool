"use client";
import ImageTool from "./_image-tool";

export default function AddTextToImage() {
  return (
    <ImageTool
      actionLabel="Add text"
      defaultOptions={{ text: "Your text", size: "0", color: "#ffffff", position: "bottom" }}
      renderOptions={(o, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tx-t">Text</label>
            <input id="tx-t" className="tool-input" type="text" value={o.text} onChange={(e) => setOpt("text", e.target.value)} disabled={busy} placeholder="Your text" />
          </div>
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="tx-p">Position</label>
              <select id="tx-p" className="tool-select" value={o.position} onChange={(e) => setOpt("position", e.target.value)} disabled={busy}>
                <option value="top">Top</option>
                <option value="center">Center</option>
                <option value="bottom">Bottom</option>
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="tx-c">Color</label>
              <input id="tx-c" type="color" value={o.color} onChange={(e) => setOpt("color", e.target.value)} disabled={busy} />
            </div>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="tx-s">Text size (0 = auto): {o.size}</label>
            <input id="tx-s" type="range" min="0" max="200" step="2" value={o.size} onChange={(e) => setOpt("size", e.target.value)} disabled={busy} />
          </div>
        </>
      )}
      draw={(ctx, img, o, c) => {
        const w = img.naturalWidth, h = img.naturalHeight;
        c.width = w; c.height = h;
        ctx.drawImage(img, 0, 0);
        const size = parseInt(o.size, 10) || 0;
        const fs = size > 0 ? size : Math.max(14, Math.round(w / 12));
        ctx.font = `bold ${fs}px Arial, sans-serif`;
        ctx.textAlign = "center";
        ctx.textBaseline = "middle";
        ctx.lineJoin = "round";
        ctx.lineWidth = Math.max(1, fs / 10);
        ctx.strokeStyle = "rgba(0,0,0,0.65)";
        ctx.fillStyle = o.color || "#ffffff";
        const x = w / 2;
        const pad = fs * 0.9;
        const y = o.position === "top" ? pad : o.position === "center" ? h / 2 : h - pad;
        const text = (o.text || "Your text").slice(0, 120);
        ctx.strokeText(text, x, y);
        ctx.fillText(text, x, y);
      }}
    />
  );
}
