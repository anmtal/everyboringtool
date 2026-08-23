"use client";

import { useState, useRef, useCallback } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";

function parseTime(s) {
  s = String(s).trim();
  if (!s) return null;
  if (/^\d+(\.\d+)?$/.test(s)) return parseFloat(s);
  const parts = s.split(":").map((p) => Number(p));
  if (parts.some((p) => Number.isNaN(p))) return null;
  let sec = 0;
  for (const p of parts) sec = sec * 60 + p;
  return sec;
}
function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function VideoTrim() {
  const [file, setFile] = useState(null);
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("");
  const [precise, setPrecise] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!f.type.startsWith("video/") && !/\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(f.name)) {
      setError("Please choose a video file."); return;
    }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    const s = parseTime(start);
    const e = parseTime(end);
    if (s === null || e === null) { setError("Enter start and end times as seconds or M:SS (e.g. 0:05)."); return; }
    if (e <= s) { setError("The end time must be after the start time."); return; }
    setBusy(true); setError(""); setResult(null); setProgress(0);
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading video engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0];
      const inName = "input" + ext;
      const outName = "trimmed" + ext;
      setStatus("Reading your video…");
      await ff.writeFile(inName, await fetchFile(file));
      setStatus(precise ? "Trimming (precise re-encode)…" : "Trimming…");
      const dur = String(e - s);
      const args = precise
        ? ["-ss", String(s), "-i", inName, "-t", dur, "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", outName]
        : ["-ss", String(s), "-i", inName, "-t", dur, "-c", "copy", outName];
      await ff.exec(args);
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const blob = new Blob([data.buffer], { type: file.type || "video/mp4" });
      const base = file.name.replace(/\.[^.]+$/, "") || "video";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-trimmed${ext}`, size: blob.size });
      setStatus("");
    } catch {
      setError("Couldn't trim the video. Try the precise option, or a different file.");
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false); setProgress(0);
    }
  }, [file, start, end, precise]);

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
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing uploaded" : "MP4, MOV, WEBM, MKV and more"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="vt-start">Start (s or M:SS)</label>
            <input id="vt-start" className="tool-input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0:00" disabled={busy} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="vt-end">End (s or M:SS)</label>
            <input id="vt-end" className="tool-input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="0:20" disabled={busy} />
          </div>
        </div>
        <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={precise} onChange={(e) => setPrecise(e.target.checked)} disabled={busy} />
          Precise cut (re-encodes — slower, but cuts exactly on the frame instead of the nearest keyframe)
        </label>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : "Trim video"}
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
        <div className="tool-result">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          <video controls src={result.url} style={{ width: "100%", maxWidth: 420, marginTop: 8, borderRadius: 8, background: "#000" }} />
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {result.name}</a>
          </div>
        </div>
      )}

      <p className="tool-note">First run downloads a ~32 MB engine (cached after). Everything runs on your device — your video is never uploaded.</p>
    </div>
  );
}
