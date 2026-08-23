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

export default function AudioTrim() {
  const [file, setFile] = useState(null);
  const [start, setStart] = useState("0:00");
  const [end, setEnd] = useState("");
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
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac|opus|weba)$/i.test(f.name)) {
      setError("Please choose an audio file."); return;
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
      setStatus("Loading audio engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp3"])[0];
      const inName = "input" + ext;
      const outName = "trimmed" + ext;
      setStatus("Reading your audio…");
      await ff.writeFile(inName, await fetchFile(file));
      setStatus("Trimming…");
      await ff.exec(["-ss", String(s), "-i", inName, "-t", String(e - s), "-c", "copy", outName]);
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const blob = new Blob([data.buffer], { type: file.type || "audio/mpeg" });
      const base = file.name.replace(/\.[^.]+$/, "") || "audio";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-trimmed${ext}`, size: blob.size });
      setStatus("");
    } catch {
      setError("Couldn't trim the audio — the file may be an unsupported format or too large.");
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false); setProgress(0);
    }
  }, [file, start, end]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="audio/*" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose an audio file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing uploaded" : "MP3, WAV, M4A, OGG, FLAC and more"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="at-start">Start (s or M:SS)</label>
            <input id="at-start" className="tool-input" value={start} onChange={(e) => setStart(e.target.value)} placeholder="0:00" disabled={busy} />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="at-end">End (s or M:SS)</label>
            <input id="at-end" className="tool-input" value={end} onChange={(e) => setEnd(e.target.value)} placeholder="0:30" disabled={busy} />
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : "Trim audio"}
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
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {result.name}</a>
          </div>
        </div>
      )}

      <p className="tool-note">First run downloads a ~32 MB engine (cached after). Everything runs on your device — your audio is never uploaded.</p>
    </div>
  );
}
