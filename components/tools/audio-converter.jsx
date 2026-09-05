"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";

const FORMATS = {
  mp3: { ext: "mp3", mime: "audio/mpeg", label: "MP3", lossy: true, args: (i, o, br) => ["-i", i, "-vn", "-acodec", "libmp3lame", "-b:a", br + "k", o] },
  m4a: { ext: "m4a", mime: "audio/mp4", label: "M4A (AAC)", lossy: true, args: (i, o, br) => ["-i", i, "-vn", "-c:a", "aac", "-b:a", br + "k", o] },
  ogg: { ext: "ogg", mime: "audio/ogg", label: "OGG (Vorbis)", lossy: true, args: (i, o, br) => ["-i", i, "-vn", "-c:a", "libvorbis", "-b:a", br + "k", o] },
  wav: { ext: "wav", mime: "audio/wav", label: "WAV (uncompressed)", lossy: false, args: (i, o) => ["-i", i, "-vn", "-acodec", "pcm_s16le", o] },
  flac: { ext: "flac", mime: "audio/flac", label: "FLAC (lossless)", lossy: false, args: (i, o) => ["-i", i, "-vn", "-c:a", "flac", o] },
};
const BITRATES = [128, 192, 256, 320];

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function AudioConverter() {
  const [file, setFile] = useState(null);
  const [format, setFormat] = useState("mp3");
  const [bitrate, setBitrate] = useState(192);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const inputRef = useRef(null);

  // Free the previous output when a new conversion replaces it, and on unmount.
  useEffect(() => {
    return () => { if (result && result.url) URL.revokeObjectURL(result.url); };
  }, [result]);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/") &&
        !/\.(mp3|wav|m4a|aac|ogg|flac|opus|weba|wma|aiff|amr|mp4|mov|webm)$/i.test(f.name)) {
      setError("Please choose an audio file.");
      return;
    }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    let ff;
    const spec = FORMATS[format];
    try {
      setStatus("Loading audio engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp3"])[0];
      const inName = "input" + ext;
      const outName = "output." + spec.ext;
      setStatus("Reading your file…");
      await ff.writeFile(inName, await fetchFile(file));
      setStatus(`Converting to ${spec.label}…`);
      await ff.exec(spec.args(inName, outName, bitrate));
      const data = await ff.readFile(outName);
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile(outName).catch(() => {});
      const blob = new Blob([data.buffer], { type: spec.mime });
      const base = file.name.replace(/\.[^.]+$/, "") || "audio";
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${spec.ext}`, size: blob.size, inSize: file.size });
      setStatus("");
    } catch {
      setError("Couldn't convert that file — it may be an unsupported format or too large for the browser to handle.");
      setStatus("");
    } finally {
      setBusy(false);
    }
  }, [file, format, bitrate]);

  const spec = FORMATS[format];

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
        style={busy ? { opacity: 0.6, cursor: "progress" } : undefined}
      >
        <input ref={inputRef} type="file" accept="audio/*,video/*" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose an audio file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing is uploaded" : "MP3, WAV, M4A, AAC, OGG, FLAC and more"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ac-format">Convert to</label>
            <select id="ac-format" className="tool-select" value={format} onChange={(e) => setFormat(e.target.value)} disabled={busy}>
              {Object.entries(FORMATS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
            </select>
          </div>
          {spec.lossy && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="ac-bitrate">Bitrate</label>
              <select id="ac-bitrate" className="tool-select" value={bitrate} onChange={(e) => setBitrate(Number(e.target.value))} disabled={busy}>
                {BITRATES.map((b) => <option key={b} value={b}>{b} kbps{b === 192 ? " (recommended)" : b === 320 ? " (best)" : ""}</option>)}
              </select>
            </div>
          )}
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Converting…" : `Convert to ${spec.label.split(" ")[0]}`}
        </button>
      </div>

      {busy && <p className="tool-note" aria-live="polite">{status}</p>}
      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            Done — {fmtBytes(result.size)}
            {result.inSize ? ` (was ${fmtBytes(result.inSize)})` : ""}
          </p>
          <audio controls src={result.url} style={{ width: "100%", marginTop: 8 }} />
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      <p className="tool-note">
        Converts audio between MP3, WAV, M4A, OGG and FLAC, entirely in your browser — your file is never uploaded.
        For MP3, 192 kbps is a great balance of size and quality; 320 kbps is the highest. Converting can't restore
        quality that was already lost in a compressed source.
      </p>
    </div>
  );
}
