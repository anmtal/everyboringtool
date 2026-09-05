"use client";

// Shared UI shell for the browser video toolkit. A tool supplies its input
// rules, its option controls, and a buildJob() that returns the ffmpeg
// arg-builder; the shell handles the dropzone, run/progress/result/download and
// blob cleanup. Not a routable tool itself (underscore-prefixed, never mounted
// by slug) — only imported by the individual video tools.
import { useState, useRef, useEffect, useCallback } from "react";
import { runVideoJob, fmtBytes } from "../../lib/videoTool";

// The only video containers browsers can play inline. Anything else (AVI, MKV,
// MPEG-TS…) would render a dead <video>, so those get a note + download instead.
const PLAYABLE_VIDEO = ["video/mp4", "video/webm", "video/quicktime"];

export default function VideoToolShell({
  accept = "video/*",
  acceptTest,
  hint,
  actionLabel = "Process",
  buildJob,
  renderOptions,
  defaultOptions = {},
  resultKind = "video", // "video" | "image" | "audio"
  fileLabel = "Choose a video file",
  note,
}) {
  const [file, setFile] = useState(null);
  const [opts, setOpts] = useState(defaultOptions);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  // Free the previous output blob before producing the next one.
  useEffect(() => () => { if (result && result.url) URL.revokeObjectURL(result.url); }, [result]);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError("");
    setResult(null);
    if (acceptTest && !acceptTest(f)) {
      setError("Please choose a video file.");
      return;
    }
    setFile(f);
  }
  const setOpt = (k, v) => setOpts((o) => ({ ...o, [k]: v }));

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true);
    setError("");
    setResult(null);
    setProgress(0);
    try {
      const job = buildJob(file, opts);
      const r = await runVideoJob({ file, ...job, onStatus: setStatus, onProgress: setProgress });
      setResult(r);
      setStatus("");
    } catch (err) {
      setError(
        (err && err.userMessage) ||
          "Couldn't process this file — it may be an unsupported format or too large for the browser to handle."
      );
      setStatus("");
    } finally {
      setBusy(false);
      setProgress(0);
    }
  }, [file, opts, buildJob]);

  const outMime = ((result && (result.mime || (result.blob && result.blob.type))) || "").toLowerCase();

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept={accept} onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : fileLabel}</p>
        <p className="dropzone-sub">
          {file ? fmtBytes(file.size) + " — runs in your browser, nothing uploaded" : hint}
        </p>
      </div>

      {renderOptions && <div className="tool-fields">{renderOptions(opts, setOpt, busy)}</div>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : actionLabel}
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
          {resultKind === "image" ? (
            <img src={result.url} alt="Result" style={{ maxWidth: "100%", marginTop: 8, borderRadius: 8 }} />
          ) : resultKind === "audio" ? (
            <audio controls src={result.url} style={{ width: "100%", marginTop: 8 }} />
          ) : PLAYABLE_VIDEO.includes(outMime) ? (
            <video controls src={result.url} style={{ width: "100%", marginTop: 8, borderRadius: 8 }} />
          ) : (
            <p className="tool-note">Preview isn&rsquo;t supported for this format in the browser — download it to play.</p>
          )}
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      {note || (
        <p className="tool-note">
          The first run downloads a ~32 MB video engine (cached afterwards). Everything then runs on your
          device — your file is never uploaded.
        </p>
      )}
    </div>
  );
}
