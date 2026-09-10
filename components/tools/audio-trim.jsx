"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile, sizeWarning, terminateFFmpeg } from "../../lib/ffmpegClient";

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
  const [warn, setWarn] = useState("");
  const [canceled, setCanceled] = useState(false);

  // Release the previous output blob. React runs this cleanup before the next
  // effect, so re-running a tool frees the old result instead of pinning every
  // output (video results can be hundreds of MB) for the life of the tab.
  useEffect(() => {
    return () => {
      if (result && result.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const canceledRef = useRef(false);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null); setCanceled(false); setWarn("");
    if (!f.type.startsWith("audio/") && !/\.(mp3|wav|m4a|aac|ogg|flac|opus|weba)$/i.test(f.name)) {
      setError("Please choose an audio file."); return;
    }
    setFile(f);
    setWarn(sizeWarning(f) || "");
  }

  const run = useCallback(async () => {
    if (!file) return;
    const s = parseTime(start);
    const e = parseTime(end);
    if (s === null || e === null) { setError("Enter start and end times as seconds or M:SS (e.g. 0:05)."); return; }
    if (e <= s) { setError("The end time must be after the start time."); return; }
    canceledRef.current = false;
    setCanceled(false);
    setBusy(true); setError(""); setResult(null); setProgress(0);
    // The single-thread ffmpeg core can't abort one exec mid-run, so Cancel (or
    // an out-of-memory hang) races each await against a promise we reject after
    // terminating the worker — freeing the UI instead of a stuck "Working…".
    let abortReject = null;
    const abortP = new Promise((_, rej) => { abortReject = rej; });
    abortP.catch(() => {}); // mark handled — reject can fire before the first Promise.race attaches (Cancel during engine load)
    const onAbort = () => { terminateFFmpeg(); if (abortReject) abortReject(Object.assign(new Error("Canceled."), { userMessage: "Canceled." })); };
    abortRef.current = onAbort;
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading audio engine (~32 MB, one-time)…");
      ff = await Promise.race([loadFFmpeg(), abortP]);
      ff.on("progress", onProg);
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp3"])[0];
      const inName = "input" + ext;
      const outName = "trimmed" + ext;
      setStatus("Reading your audio…");
      await Promise.race([ff.writeFile(inName, await fetchFile(file)), abortP]);
      setStatus("Trimming…");
      await Promise.race([ff.exec(["-ss", String(s), "-i", inName, "-t", String(e - s), "-c", "copy", outName]), abortP]);
      const data = await Promise.race([ff.readFile(outName), abortP]);
      // The held ff reference is dead after a terminateFFmpeg(); guard cleanup.
      try {
        await ff.deleteFile(inName).catch(() => {});
        await ff.deleteFile(outName).catch(() => {});
      } catch { /* worker may already be gone */ }
      const blob = new Blob([data.buffer], { type: file.type || "audio/mpeg" });
      const base = file.name.replace(/\.[^.]+$/, "") || "audio";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-trimmed${ext}`, size: blob.size });
      setStatus("");
    } catch (err) {
      if (canceledRef.current) {
        setCanceled(true);
      } else {
        setError((err && err.userMessage) || "Couldn't trim the audio — the file may be an unsupported format or too large for the browser to handle.");
      }
      setStatus("");
    } finally {
      try { if (ff) ff.off("progress", onProg); } catch { /* worker may already be gone */ }
      abortRef.current = null;
      setBusy(false); setProgress(0);
    }
  }, [file, start, end]);

  // Cancel terminates the ffmpeg worker (the single-thread core can't stop one
  // exec mid-run), freeing the UI and memory instead of a stuck "Working…".
  const cancel = useCallback(() => {
    canceledRef.current = true;
    setStatus("Canceling…");
    if (abortRef.current) abortRef.current();
  }, []);

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

      {warn && !busy && (
        <p className="tool-note" role="note" style={{ borderLeft: "3px solid currentColor", paddingLeft: 10, opacity: 0.9 }}>
          ⚠ {warn}
        </p>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : "Trim audio"}
        </button>
        {busy && (
          <button type="button" className="btn" onClick={cancel}>Cancel</button>
        )}
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

      {canceled && !busy && (
        <p className="tool-note" role="status">Canceled. Pick a file and run again when you&rsquo;re ready.</p>
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

      <p className="tool-note">First run downloads a ~32 MB engine (cached after). Everything runs on your device — your audio is never uploaded.</p>
    </div>
  );
}
