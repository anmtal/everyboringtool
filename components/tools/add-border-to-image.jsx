"use client";
import ImageTool from "./_image-tool";

export default function AddBorderToImage() {
  return (
    <ImageTool
      actionLabel="Add border"
      defaultOptions={{ width: "24", color: "#ffffff" }}
      renderOptions={(o, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bd-w">Border width: {o.width}px</label>
            <input id="bd-w" type="range" min="0" max="200" step="2" value={o.width} onChange={(e) => setOpt("width", e.target.value)} disabled={busy} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bd-c">Border color</label>
            <input id="bd-c" type="color" value={o.color} onChange={(e) => setOpt("color", e.target.value)} disabled={busy} />
          </div>
        </>
      )}
      draw={(ctx, img, o, c) => {
        const bw = Math.max(0, parseInt(o.width, 10) || 0);
        c.width = img.naturalWidth + bw * 2;
        c.height = img.naturalHeight + bw * 2;
        ctx.fillStyle = o.color || "#ffffff";
        ctx.fillRect(0, 0, c.width, c.height);
        ctx.drawImage(img, bw, bw);
      }}
    />
  );
}
