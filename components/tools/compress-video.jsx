"use client";

import VideoToolShell from "./_video-shell";
import { inputExt } from "../../lib/videoTool";

// H.264 re-encode at a chosen CRF (higher CRF = smaller file). veryfast preset
// keeps in-browser encoding time reasonable; +faststart makes the MP4 stream.
const LEVELS = {
  small: { label: "Smallest file", crf: 30 },
  balanced: { label: "Balanced (recommended)", crf: 26 },
  high: { label: "Higher quality", crf: 22 },
};

const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(f.name);

export default function CompressVideo() {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV, AVI and more"
      actionLabel="Compress video"
      defaultOptions={{ level: "balanced" }}
      renderOptions={(opts, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="cv-level">Compression</label>
          <select id="cv-level" className="tool-select" value={opts.level} onChange={(e) => setOpt("level", e.target.value)} disabled={busy}>
            {Object.entries(LEVELS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      )}
      buildJob={(file, opts) => {
        const crf = String((LEVELS[opts.level] || LEVELS.balanced).crf);
        void inputExt(file);
        return {
          outExt: "mp4",
          outMime: "video/mp4",
          baseName: (file.name.replace(/\.[^.]+$/, "") || "video") + "-compressed",
          buildArgs: (i, o) => [
            "-i", i,
            "-c:v", "libx264", "-crf", crf, "-preset", "veryfast",
            "-c:a", "aac", "-b:a", "128k",
            "-movflags", "+faststart",
            o,
          ],
        };
      }}
    />
  );
}
