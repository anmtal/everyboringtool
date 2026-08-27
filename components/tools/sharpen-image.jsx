"use client";
import ImageTool from "./_image-tool";

// 3x3 sharpen convolution. Amount 1 = kernel center 5 (standard sharpen);
// higher amounts scale the surrounding negatives for a stronger effect.
function sharpen(ctx, img, o, c) {
  const w = img.naturalWidth, h = img.naturalHeight;
  c.width = w; c.height = h;
  ctx.drawImage(img, 0, 0);
  const amt = Math.max(0.2, Math.min(4, parseFloat(o.amount) || 1));
  const src = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const sd = src.data, od = out.data;
  const edge = amt; // magnitude of the 4 orthogonal negatives
  const center = 1 + 4 * edge;
  const k = [0, -edge, 0, -edge, center, -edge, 0, -edge, 0];
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      for (let ch = 0; ch < 3; ch++) {
        let sum = 0, ki = 0;
        for (let ky = -1; ky <= 1; ky++) {
          for (let kx = -1; kx <= 1; kx++) {
            const px = Math.min(w - 1, Math.max(0, x + kx));
            const py = Math.min(h - 1, Math.max(0, y + ky));
            sum += sd[(py * w + px) * 4 + ch] * k[ki++];
          }
        }
        const i = (y * w + x) * 4 + ch;
        od[i] = sum < 0 ? 0 : sum > 255 ? 255 : sum;
      }
      const a = (y * w + x) * 4 + 3;
      od[a] = sd[a];
    }
  }
  ctx.putImageData(out, 0, 0);
}

export default function SharpenImage() {
  return (
    <ImageTool
      actionLabel="Sharpen"
      defaultOptions={{ amount: "1" }}
      renderOptions={(o, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="sh-a">Strength: {o.amount}</label>
          <input id="sh-a" type="range" min="0.2" max="3" step="0.2" value={o.amount} onChange={(e) => setOpt("amount", e.target.value)} disabled={busy} />
        </div>
      )}
      draw={sharpen}
      note={<p className="tool-note">Large images may take a moment to sharpen — it all runs on your device.</p>}
    />
  );
}
