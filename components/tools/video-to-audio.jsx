"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";

const FORMATS = {
  mp3: { ext: "mp3", mime: "audio/mpeg", label: "MP3", args: (i, o) => ["-i", i, "-vn", "-acodec", "libmp3lame", "-q:a", "2", o] },
  m4a: { ext: "m4a", mime: "audio/mp4", label: "M4A (AAC)", args: (i, o) => ["-i", i, "-vn", "-c:a", "aac", "-b:a", "192k", o] },
  wav: { ext: "wav", mime: "audio/wav", label: "WAV", args: (i, o) => ["-i", i, "-vn", o] },
};

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function VideoToAudio() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("mp3");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Release the previous output blob. React runs this cleanup before the next
  // effect, so re-running a tool frees the old result instead of pinning every
  // output (video results can be hundreds of MB) for the life of the tab.
  useEffect(() => {
    return () => {
      if (result && result.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setResult(null);
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(f.name)) {
      setError("Please choose a video file.");
      return;
    }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading audio engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0];
      const inName = "input" + ext;
      const spec = FORMATS[format];
      const outName = "output." + spec.ext;
      setStatus("Reading your video…");
      await ff.writeFile(inName, await fetchFile(file));
      setStatus("Extracting the audio…");
      await ff.exec(spec.args(inName, outName));
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const blob = new Blob([data.buffer], { type: spec.mime });
      const base = file.name.replace(/\.[^.]+$/, "") || "audio";
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${spec.ext}`, size: blob.size });
      setStatus("");
    } catch {
      setError("Couldn't extract the audio — the file may be an unsupported format or too large for the browser to handle.");
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false);
      setProgress(0);
    }
  }, [file, format]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="video/*" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose a video file"}</p>
        <p className="dropzone-sub">
          {file ? fmtBytes(file.size) + " — runs entirely in your browser, nothing uploaded" : "MP4, MOV, WEBM, MKV and more"}
        </p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="v2a-format">Output format</label>
          <select id="v2a-format" className="tool-select" value={format} onChange={(e) => setFormat(e.target.value)} disabled={busy}>
            {Object.entries(FORMATS).map(([k, v]) => (
              <option key={k} value={k}>{v.label}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : "Extract audio"}
        </button>
      </div>

      {busy && (
        <div className="tool-note" aria-live="polite">
          {status}
          {progress > 0 && (
            <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: "rgba(128,128,128,0.25)", overflow: "hidden" }}>
              <div style={{ width: progress + "%", height: "100%", background: "currentColor", opacity: 0.7, transition: "width 150ms" }} />
            </div>
          )}
        </div>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          <audio controls src={result.url} style={{ width: "100%", marginTop: 8 }} />
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      <p className="tool-note">
        The first run downloads a ~32 MB audio engine (cached afterwards). Everything then runs on your device — your
        video is never uploaded.
      </p>
    </div>
  );
}
