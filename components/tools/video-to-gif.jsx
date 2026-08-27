"use client";

import VideoToolShell from "./_video-shell";

const FPS = { 10: "Smooth enough (10 fps)", 15: "Smoother (15 fps)", 20: "Smoothest (20 fps)" };
const WIDTH = { 320: "Small (320px wide)", 480: "Medium (480px wide)", 640: "Large (640px wide)" };
const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(f.name);

export default function VideoToGif() {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV and more — a short clip makes the best GIF"
      actionLabel="Make GIF"
      resultKind="image"
      defaultOptions={{ fps: "15", width: "480" }}
      renderOptions={(opts, setOpt, busy) => (
        <>
          <div className="tool-field">
            <label className="tool-label" htmlFor="g-fps">Frame rate</label>
            <select id="g-fps" className="tool-select" value={opts.fps} onChange={(e) => setOpt("fps", e.target.value)} disabled={busy}>
              {Object.entries(FPS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="g-w">Size</label>
            <select id="g-w" className="tool-select" value={opts.width} onChange={(e) => setOpt("width", e.target.value)} disabled={busy}>
              {Object.entries(WIDTH).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
            </select>
          </div>
        </>
      )}
      buildJob={(file, opts) => {
        const fps = String(parseInt(opts.fps, 10) || 15);
        const w = String(parseInt(opts.width, 10) || 480);
        return {
          outExt: "gif",
          outMime: "image/gif",
          baseName: file.name.replace(/\.[^.]+$/, "") || "video",
          buildArgs: (i, o) => ["-i", i, "-vf", `fps=${fps},scale=${w}:-1:flags=lanczos`, "-loop", "0", o],
        };
      }}
    />
  );
}
