"use client";
import ImageTool from "./_image-tool";

// PFP Maker — turn a photo into a clean profile picture: shape (circle/rounded/
// square), a solid or gradient background, padding for the trendy gradient-ring
// look, zoom, and an optional ring. All client-side canvas; exports a PNG.
function clamp(v, a, b) { return Math.min(b, Math.max(a, v)); }

function roundedPath(ctx, x, y, w, h, r) {
  if (ctx.roundRect) { ctx.roundRect(x, y, w, h, r); return; }
  r = Math.min(r, w / 2, h / 2);
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
}

export default function PfpMaker() {
  return (
    <ImageTool
      fileLabel="Choose a photo"
      actionLabel="Create PFP"
      outType="image/png"
      outExt="png"
      defaultOptions={{
        shape: "circle", size: "512", bg: "gradient",
        c1: "#6c5ce7", c2: "#d6296a", padding: "8", zoom: "100",
        ring: "0", ringColor: "#ffffff",
      }}
      note={<p className="tool-note">Exported as a square PNG with a transparent background — drops straight into any profile picture slot.</p>}
      renderOptions={(o, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-shape">Shape</label>
            <select id="pfp-shape" className="tool-input" value={o.shape} onChange={(e) => setOpt("shape", e.target.value)} disabled={busy}>
              <option value="circle">Circle</option>
              <option value="rounded">Rounded square</option>
              <option value="square">Square</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-size">Size</label>
            <select id="pfp-size" className="tool-input" value={o.size} onChange={(e) => setOpt("size", e.target.value)} disabled={busy}>
              <option value="400">400 × 400 — X / LinkedIn</option>
              <option value="512">512 × 512 — Discord / standard</option>
              <option value="800">800 × 800 — large</option>
              <option value="1000">1000 × 1000 — extra large</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-bg">Background</label>
            <select id="pfp-bg" className="tool-input" value={o.bg} onChange={(e) => setOpt("bg", e.target.value)} disabled={busy}>
              <option value="gradient">Gradient</option>
              <option value="solid">Solid color</option>
              <option value="transparent">Transparent</option>
            </select>
          </div>

          {o.bg !== "transparent" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="pfp-c1">{o.bg === "gradient" ? "Gradient start" : "Background color"}</label>
              <input id="pfp-c1" type="color" value={o.c1} onChange={(e) => setOpt("c1", e.target.value)} disabled={busy} />
            </div>
          )}
          {o.bg === "gradient" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="pfp-c2">Gradient end</label>
              <input id="pfp-c2" type="color" value={o.c2} onChange={(e) => setOpt("c2", e.target.value)} disabled={busy} />
            </div>
          )}

          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-pad">Padding: {o.padding}%</label>
            <input id="pfp-pad" type="range" min="0" max="30" step="1" value={o.padding} onChange={(e) => setOpt("padding", e.target.value)} disabled={busy} />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-zoom">Zoom: {o.zoom}%</label>
            <input id="pfp-zoom" type="range" min="100" max="260" step="2" value={o.zoom} onChange={(e) => setOpt("zoom", e.target.value)} disabled={busy} />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="pfp-ring">Ring: {o.ring}px</label>
            <input id="pfp-ring" type="range" min="0" max="60" step="1" value={o.ring} onChange={(e) => setOpt("ring", e.target.value)} disabled={busy} />
          </div>
          {parseInt(o.ring, 10) > 0 && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="pfp-rc">Ring color</label>
              <input id="pfp-rc" type="color" value={o.ringColor} onChange={(e) => setOpt("ringColor", e.target.value)} disabled={busy} />
            </div>
          )}
        </>
      )}
      draw={(ctx, img, o, c) => {
        const size = parseInt(o.size, 10) || 512;
        c.width = size; c.height = size;
        const shape = o.shape || "circle";
        const pad = size * (clamp(parseFloat(o.padding) || 0, 0, 30) / 100);
        const ring = clamp(parseInt(o.ring, 10) || 0, 0, 60);
        const zoom = Math.max(1, (parseFloat(o.zoom) || 100) / 100);
        const rrO = size * 0.20;

        function path(inset, rr) {
          ctx.beginPath();
          if (shape === "circle") ctx.arc(size / 2, size / 2, Math.max(0, size / 2 - inset), 0, Math.PI * 2);
          else if (shape === "rounded") roundedPath(ctx, inset, inset, size - 2 * inset, size - 2 * inset, Math.max(0, rr));
          else ctx.rect(inset, inset, size - 2 * inset, size - 2 * inset);
          ctx.closePath();
        }

        ctx.clearRect(0, 0, size, size);

        // background (inside the outer shape)
        if (o.bg !== "transparent") {
          ctx.save(); path(0, rrO); ctx.clip();
          if (o.bg === "gradient") {
            const g = ctx.createLinearGradient(0, 0, size, size);
            g.addColorStop(0, o.c1 || "#6c5ce7");
            g.addColorStop(1, o.c2 || "#d6296a");
            ctx.fillStyle = g;
          } else ctx.fillStyle = o.c1 || "#111111";
          ctx.fillRect(0, 0, size, size);
          ctx.restore();
        }

        // photo (inside the inner shape, inset by padding), cover + zoom
        ctx.save();
        path(pad, Math.max(0, (size - 2 * pad) * 0.20));
        ctx.clip();
        const iw = size - 2 * pad;
        const src = Math.min(img.naturalWidth, img.naturalHeight) / zoom;
        const sx = (img.naturalWidth - src) / 2;
        const sy = (img.naturalHeight - src) / 2;
        ctx.drawImage(img, sx, sy, src, src, pad, pad, iw, iw);
        ctx.restore();

        // ring on the outer edge
        if (ring > 0) {
          ctx.save();
          path(ring / 2, Math.max(0, rrO - ring / 2));
          ctx.lineWidth = ring;
          ctx.strokeStyle = o.ringColor || "#ffffff";
          ctx.stroke();
          ctx.restore();
        }
      }}
    />
  );
}
