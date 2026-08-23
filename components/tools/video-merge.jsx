"use client";

import { useState, useRef, useCallback } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function VideoMerge() {
  const [files, setFiles] = useState([]);
  const [reencode, setReencode] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  function onPick(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setError(""); setResult(null);
    const ok = picked.filter((f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp)$/i.test(f.name));
    if (!ok.length) { setError("Please choose video files."); return; }
    setFiles((prev) => [...prev, ...ok]);
  }
  const move = (i, d) => setFiles((prev) => {
    const a = [...prev]; const j = i + d;
    if (j < 0 || j >= a.length) return prev;
    [a[i], a[j]] = [a[j], a[i]]; return a;
  });
  const remove = (i) => setFiles((prev) => prev.filter((_, k) => k !== i));

  const run = useCallback(async () => {
    if (files.length < 2) { setError("Add at least two video clips to merge."); return; }
    setBusy(true); setError(""); setResult(null); setProgress(0);
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading video engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const names = [];
      setStatus("Reading your clips…");
      for (let i = 0; i < files.length; i++) {
        const ext = (files[i].name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0];
        const n = `in${i}${ext}`;
        await ff.writeFile(n, await fetchFile(files[i]));
        names.push(n);
      }
      const firstExt = (files[0].name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0].toLowerCase();
      const outExt = reencode ? ".mp4" : firstExt;
      const outName = "output" + outExt;
      setStatus(reencode ? "Merging (re-encode — this can take a while)…" : "Merging…");
      if (reencode) {
        const args = [];
        names.forEach((n) => args.push("-i", n));
        // Normalize every clip to 1280x720 @30fps + 44.1 kHz stereo first, so clips
        // of different resolutions, frame rates or formats concatenate cleanly.
        const pre = names.map((_, i) =>
          `[${i}:v:0]scale=1280:720:force_original_aspect_ratio=decrease,pad=1280:720:(ow-iw)/2:(oh-ih)/2,setsar=1,fps=30[v${i}];` +
          `[${i}:a:0]aformat=sample_fmts=fltp:sample_rates=44100:channel_layouts=stereo[a${i}]`
        ).join(";");
        const labels = names.map((_, i) => `[v${i}][a${i}]`).join("");
        args.push("-filter_complex", `${pre};${labels}concat=n=${names.length}:v=1:a=1[v][a]`,
          "-map", "[v]", "-map", "[a]", "-c:v", "libx264", "-preset", "veryfast", "-c:a", "aac", outName);
        await ff.exec(args);
      } else {
        const list = names.map((n) => `file '${n}'`).join("\n");
        await ff.writeFile("list.txt", new TextEncoder().encode(list));
        await ff.exec(["-f", "concat", "-safe", "0", "-i", "list.txt", "-c", "copy", outName]);
        await ff.deleteFile("list.txt").catch(() => {});
      }
      const data = await ff.readFile(outName);
      for (const n of names) await ff.deleteFile(n).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const mimeByExt = { ".mp4": "video/mp4", ".webm": "video/webm", ".mov": "video/quicktime", ".mkv": "video/x-matroska", ".m4v": "video/mp4" };
      const blob = new Blob([data.buffer], { type: mimeByExt[outExt] || "video/mp4" });
      setResult({ url: URL.createObjectURL(blob), name: `merged${outExt}`, size: blob.size });
      setStatus("");
    } catch {
      setError(
        reencode
          ? "Couldn't merge the clips. One clip may be missing an audio track, or the files are too large for the browser."
          : "Couldn't merge — fast merge needs clips in the same format/resolution. Try the “re-encode for compatibility” option below."
      );
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false); setProgress(0);
    }
  }, [files, reencode]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="video/*" multiple onChange={onPick} hidden />
        <p className="dropzone-title">Choose video clips</p>
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
          <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
            <input type="checkbox" checked={reencode} onChange={(e) => setReencode(e.target.checked)} disabled={busy} />
            Re-encode for compatibility (use if clips are different formats/resolutions — slower)
          </label>
        </div>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={files.length < 2 || busy}>
          {busy ? "Working…" : `Merge ${files.length || ""} clips`}
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

      <p className="tool-note">Fast merge works best with clips of the same format and resolution (e.g. from the same camera). First run downloads a ~32 MB engine (cached after); everything runs on your device.</p>
    </div>
  );
}
