"use client";

import VideoToolShell from "./_video-shell";

// Scale to a target height, keeping aspect (width = -2 → nearest even number so
// H.264 is happy). Re-encodes to MP4/H.264 so the result plays anywhere.
const HEIGHTS = {
  1080: "1080p (Full HD)",
  720: "720p (HD)",
  480: "480p",
  360: "360p",
};
const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(f.name);

export default function ResizeVideo() {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV, AVI and more"
      actionLabel="Resize video"
      defaultOptions={{ height: "720" }}
      renderOptions={(opts, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="rv-h">Resolution</label>
          <select id="rv-h" className="tool-select" value={opts.height} onChange={(e) => setOpt("height", e.target.value)} disabled={busy}>
            {Object.entries(HEIGHTS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </div>
      )}
      buildJob={(file, opts) => {
        const h = String(parseInt(opts.height, 10) || 720);
        return {
          outExt: "mp4",
          outMime: "video/mp4",
          baseName: (file.name.replace(/\.[^.]+$/, "") || "video") + `-${h}p`,
          buildArgs: (i, o) => [
            "-i", i,
            "-vf", `scale=-2:${h}`,
            "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
            "-c:a", "aac", "-b:a", "160k",
            "-movflags", "+faststart",
            o,
          ],
        };
      }}
    />
  );
}
