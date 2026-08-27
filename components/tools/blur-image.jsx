"use client";
import ImageTool from "./_image-tool";

export default function BlurImage() {
  return (
    <ImageTool
      actionLabel="Blur image"
      defaultOptions={{ strength: "6" }}
      renderOptions={(o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="bl-s">Blur strength: {o.strength}px</label>
          <input id="bl-s" type="range" min="1" max="30" step="1" value={o.strength} onChange={(e) => setOpt("strength", e.target.value)} disabled={busy} />
        </div>
      )}
      draw={(ctx, img, o, c) => {
        const r = Math.max(0, parseInt(o.strength, 10) || 6);
        c.width = img.naturalWidth;
        c.height = img.naturalHeight;
        ctx.filter = `blur(${r}px)`;
        ctx.drawImage(img, 0, 0);
      }}
    />
  );
}
