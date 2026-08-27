"use client";
import ImageTool from "./_image-tool";

export default function BrightnessContrast() {
  return (
    <ImageTool
      actionLabel="Apply"
      defaultOptions={{ brightness: "100", contrast: "100" }}
      renderOptions={(o, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-b">Brightness: {o.brightness}%</label>
            <input id="bc-b" type="range" min="0" max="200" step="5" value={o.brightness} onChange={(e) => setOpt("brightness", e.target.value)} disabled={busy} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="bc-c">Contrast: {o.contrast}%</label>
            <input id="bc-c" type="range" min="0" max="200" step="5" value={o.contrast} onChange={(e) => setOpt("contrast", e.target.value)} disabled={busy} />
          </div>
        </>
      )}
      draw={(ctx, img, o, c) => {
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        const b = parseInt(o.brightness, 10) || 100;
        const ct = parseInt(o.contrast, 10) || 100;
        ctx.filter = `brightness(${b}%) contrast(${ct}%)`;
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
