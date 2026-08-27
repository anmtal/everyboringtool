"use client";
import ImageTool from "./_image-tool";

export default function PixelateImage() {
  return (
    <ImageTool
      actionLabel="Pixelate"
      defaultOptions={{ size: "12" }}
      renderOptions={(o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="px-s">Pixel size: {o.size}</label>
          <input id="px-s" type="range" min="2" max="60" step="1" value={o.size} onChange={(e) => setOpt("size", e.target.value)} disabled={busy} />
        </div>
      )}
      draw={(ctx, img, o, c) => {
        const w = img.naturalWidth, h = img.naturalHeight;
        const size = Math.max(2, parseInt(o.size, 10) || 12);
        c.width = w; c.height = h;
        const sw = Math.max(1, Math.round(w / size));
        const sh = Math.max(1, Math.round(h / size));
        const tmp = document.createElement("canvas");
        tmp.width = sw; tmp.height = sh;
        tmp.getContext("2d").drawImage(img, 0, 0, sw, sh);
        ctx.imageSmoothingEnabled = false;
        ctx.drawImage(tmp, 0, 0, sw, sh, 0, 0, w, h);
      }}
    />
  );
}
