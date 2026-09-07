"use client";

import { useState } from "react";
import VideoToolShell from "./_video-shell";
import { inputExt } from "../../lib/videoTool";

// Quality-first CRF ladder (higher CRF = smaller). veryfast keeps in-browser
// encode time sane; +faststart streams the MP4.
const LEVELS = {
  small: { label: "Smallest file", crf: 30 },
  balanced: { label: "Balanced (recommended)", crf: 26 },
  high: { label: "Higher quality", crf: 22 },
};

const QUICK_MB = [8, 10, 16, 25, 50];
const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(f.name);

// Read a video's duration (seconds) from its metadata, in the browser.
function videoDuration(file) {
  return new Promise((resolve, reject) => {
    const v = document.createElement("video");
    v.preload = "metadata";
    const url = URL.createObjectURL(file);
    v.onloadedmetadata = () => { URL.revokeObjectURL(url); resolve(Number(v.duration) || 0); };
    v.onerror = () => { URL.revokeObjectURL(url); reject(new Error("no metadata")); };
    v.src = url;
  });
}

export default function CompressVideo({ initialMode = "target", initialTargetMb = 25, initialLevel = "balanced" } = {}) {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV, AVI and more"
      actionLabel="Compress video"
      defaultOptions={{ mode: initialMode, targetMb: initialTargetMb, level: initialLevel }}
      note={
        <p className="tool-note">
          Target-size mode aims to bring the file under the size you pick by lowering the video bitrate — the result is
          approximate and undershoots slightly to stay under limits like Discord or email. Long or high-resolution clips
          take longer and use more memory, since everything is encoded in your browser; the first run also downloads a
          ~32&nbsp;MB engine (cached afterwards). Nothing is uploaded.
        </p>
      }
      renderOptions={(opts, setOpt, busy) => (
        <>
          <div className="seg-toggle" role="tablist" aria-label="Compression mode" style={{ marginBottom: 12 }}>
            <button type="button" role="tab" aria-selected={opts.mode === "target"} disabled={busy}
              className={`seg-btn ${opts.mode === "target" ? "is-active" : ""}`} onClick={() => setOpt("mode", "target")}>Target file size</button>
            <button type="button" role="tab" aria-selected={opts.mode === "quality"} disabled={busy}
              className={`seg-btn ${opts.mode === "quality" ? "is-active" : ""}`} onClick={() => setOpt("mode", "quality")}>Quality level</button>
          </div>

          {opts.mode === "target" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cv-target">Target size (MB)</label>
              <input id="cv-target" className="tool-input" type="number" min="1" step="1" inputMode="numeric"
                value={opts.targetMb} disabled={busy}
                onChange={(e) => setOpt("targetMb", e.target.value)} style={{ maxWidth: 160 }} />
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
                {QUICK_MB.map((m) => (
                  <button key={m} type="button" className={`btn btn-sm ${Number(opts.targetMb) === m ? "btn-primary" : ""}`}
                    disabled={busy} onClick={() => setOpt("targetMb", m)}>{m} MB</button>
                ))}
              </div>
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cv-level">Compression</label>
              <select id="cv-level" className="tool-select" value={opts.level} disabled={busy} onChange={(e) => setOpt("level", e.target.value)}>
                {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
              </select>
            </div>
          )}
        </>
      )}
      buildJob={async (file, opts) => {
        void inputExt(file);
        const baseName = (file.name.replace(/\.[^.]+$/, "") || "video") + "-compressed";
        const common = { outExt: "mp4", outMime: "video/mp4", baseName };

        if (opts.mode === "target") {
          const targetMb = Math.max(1, Number(opts.targetMb) || 25);
          let dur = 0;
          try { dur = await videoDuration(file); } catch { dur = 0; }
          if (dur > 0) {
            // Budget the bytes with ~10% headroom for container/muxing overhead, then
            // split total bitrate into audio (128k) + video.
            const targetBytes = targetMb * 1000 * 1000 * 0.9;
            const totalKbps = (targetBytes * 8 / 1000) / dur;
            const vKbps = Math.max(64, Math.floor(totalKbps - 128));
            return {
              ...common,
              buildArgs: (i, o) => [
                "-i", i,
                "-c:v", "libx264", "-b:v", `${vKbps}k`, "-maxrate", `${Math.floor(vKbps * 1.45)}k`, "-bufsize", `${vKbps * 2}k`,
                "-preset", "veryfast",
                "-c:a", "aac", "-b:a", "128k",
                "-movflags", "+faststart",
                o,
              ],
            };
          }
          // Couldn't read duration (e.g. an AVI/MKV the browser can't probe) — fall
          // back to a balanced CRF so the run still succeeds.
        }

        const crf = String((LEVELS[opts.level] || LEVELS.balanced).crf);
        return {
          ...common,
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
