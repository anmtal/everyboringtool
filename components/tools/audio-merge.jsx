"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function AudioMerge() {
  const [files, setFiles] = useState([]);
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
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setError(""); setResult(null);
    const ok = picked.filter((f) => f.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|opus|weba)$/i.test(f.name));
    if (!ok.length) { setError("Please choose audio files."); return; }
    setFiles((prev) => [...prev, ...ok]);
  }
  const move = (i, d) => setFiles((prev) => {
    const a = [...prev]; const j = i + d;
    if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  });
  const remove = (i) => setFiles((prev) => prev.filter((_, k) => k !== i));

  const run = useCallback(async () => {
    if (files.length < 2) { setError("Add at least two audio files to merge."); return; }
    setBusy(true); setError(""); setResult(null); setProgress(0);
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading audio engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const names = [];
      setStatus("Reading your files…");
      for (let i = 0; i < files.length; i++) {
        const ext = (files[i].name.match(/\.[a-z0-9]+$/i) || [".mp3"])[0];
        const n = `in${i}${ext}`;
        await ff.writeFile(n, await fetchFile(files[i]));
        names.push(n);
      }
      setStatus("Merging…");
      const args = [];
      names.forEach((n) => args.push("-i", n));
      // Normalize every input to 44.1 kHz stereo FIRST, so files with different
      // formats, sample rates or channel counts concatenate cleanly (the concat
      // filter otherwise requires all inputs to share the same parameters).
      const pre = names.map((_, i) => `[${i}:a]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`).join(";");
      const labels = names.map((_, i) => `[a${i}]`).join("");
      args.push("-filter_complex", `${pre};${labels}concat=n=${names.length}:v=0:a=1[out]`, "-map", "[out]", "output.mp3");
      await ff.exec(args);
      const data = await ff.readFile("output.mp3");
      for (const n of names) await ff.deleteFile(n).catch(() => {});
      await ff.deleteFile("output.mp3").catch(() => {});
      const blob = new Blob([data.buffer], { type: "audio/mpeg" });
      setResult({ url: URL.createObjectURL(blob), name: "merged.mp3", size: blob.size });
      setStatus("");
    } catch {
      setError("Couldn't merge the audio — one of the files may be an unsupported format or too large.");
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false); setProgress(0);
    }
  }, [files]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="audio/*" multiple onChange={onPick} hidden />
        <p className="dropzone-title">Choose audio files</p>
        <p className="dropzone-sub">Add two or more — they'll join in the order below. Nothing is uploaded.</p>
      </div>

      {files.length > 0 && (
        <div className="tool-fields">
          {files.map((f, i) => (
            <div key={i} className="tool-row" style={{ alignItems: "center", gap: 8 }}>
              <span className="tool-note" style={{ flex: 1, margin: 0, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                {i + 1}. {f.name} <span style={{ opacity: 0.6 }}>({fmtBytes(f.size)})</span>
              </span>
              <button type="button" className="btn" onClick={() => move(i, -1)} disabled={busy || i === 0} aria-label="Move up">↑</button>
              <button type="button" className="btn" onClick={() => move(i, 1)} disabled={busy || i === files.length - 1} aria-label="Move down">↓</button>
              <button type="button" className="btn" onClick={() => remove(i)} disabled={busy} aria-label="Remove">✕</button>
            </div>
          ))}
        </div>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={files.length < 2 || busy}>
          {busy ? "Working…" : `Merge ${files.length || ""} files`}
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

      <p className="tool-note">Files are joined into one MP3 in the order shown. First run downloads a ~32 MB engine (cached after); everything runs on your device.</p>
    </div>
  );
}
