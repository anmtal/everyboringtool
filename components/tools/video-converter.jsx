"use client";

import VideoToolShell from "./_video-shell";

// One tool, the whole common container matrix. Each target re-encodes to codecs
// that are valid for its container and are compiled into the shared core
// (H.264/AAC, VP9/Opus, MPEG-4/MP3). H.264 targets force yuv420p so the result
// plays in every browser and player; VP9 runs in realtime/cpu-used 8 mode
// because libvpx's defaults are unusably slow in the single-threaded WASM core.
const OUT = {
  mp4:  { label: "MP4 (H.264)",  mime: "video/mp4",         args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", "-movflags", "+faststart", "-pix_fmt", "yuv420p", o] },
  webm: { label: "WEBM (VP9)",   mime: "video/webm",        args: (i, o) => ["-i", i, "-c:v", "libvpx-vp9", "-crf", "32", "-b:v", "0", "-deadline", "realtime", "-cpu-used", "8", "-c:a", "libopus", o] },
  mkv:  { label: "MKV (H.264)",  mime: "video/x-matroska",  args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", o] },
  mov:  { label: "MOV (H.264)",  mime: "video/quicktime",   args: (i, o) => ["-i", i, "-c:v", "libx264", "-crf", "23", "-preset", "veryfast", "-c:a", "aac", "-b:a", "160k", "-pix_fmt", "yuv420p", o] },
  avi:  { label: "AVI (MPEG-4)", mime: "video/x-msvideo",   args: (i, o) => ["-i", i, "-c:v", "mpeg4", "-vtag", "xvid", "-qscale:v", "4", "-c:a", "libmp3lame", "-q:a", "4", o] },
};

const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv|ts)$/i.test(f.name);

export default function VideoConverter() {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV, AVI, FLV and more"
      actionLabel="Convert video"
      defaultOptions={{ to: "mp4" }}
      renderOptions={(opts, setOpt, busy) => (
        <div className="tool-field">
          <label className="tool-label" htmlFor="vc-to">Convert to</label>
          <select id="vc-to" className="tool-select" value={opts.to} onChange={(e) => setOpt("to", e.target.value)} disabled={busy}>
            {Object.entries(OUT).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      )}
      buildJob={(file, opts) => {
        const spec = OUT[opts.to] || OUT.mp4;
        return { outExt: opts.to, outMime: spec.mime, buildArgs: spec.args };
      }}
    />
  );
}
