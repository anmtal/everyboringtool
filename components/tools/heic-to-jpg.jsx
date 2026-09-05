"use client";

import { useState, useRef, useCallback, useEffect } from "react";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function HeicToJpg() {
  const [file, setFile] = useState(null);
  const [type, setType] = useState("image/jpeg");
  const [quality, setQuality] = useState(0.9);
  const [busy, setBusy] = useState(false);
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
    setError(""); setResult(null);
    if (!/\.(heic|heif)$/i.test(f.name) && !/hei[cf]/i.test(f.type)) {
      setError("Please choose a HEIC or HEIF file (the format iPhones use).");
      return;
    }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null);
    try {
      const heic2any = (await import("heic2any")).default;
      const out = await heic2any({ blob: file, toType: type, quality: type === "image/jpeg" ? Number(quality) : undefined });
      const blob = Array.isArray(out) ? out[0] : out;
      const ext = type === "image/png" ? "png" : "jpg";
      const base = file.name.replace(/\.[^.]+$/, "") || "image";
      setResult({ url: URL.createObjectURL(blob), name: `${base}.${ext}`, size: blob.size });
    } catch {
      setError("Couldn't convert that file — it may not be a valid HEIC image, or it's too large for the browser.");
    } finally {
      setBusy(false);
    }
  }, [file, type, quality]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept=".heic,.heif,image/heic,image/heif" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose a HEIC file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing uploaded" : "The .heic photos your iPhone takes"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="h2j-type">Convert to</label>
            <select id="h2j-type" className="tool-select" value={type} onChange={(e) => setType(e.target.value)} disabled={busy}>
              <option value="image/jpeg">JPG</option>
              <option value="image/png">PNG</option>
            </select>
          </div>
          {type === "image/jpeg" && (
            <div className="tool-field">
              <label className="tool-label" htmlFor="h2j-q">Quality: {Math.round(quality * 100)}%</label>
              <input id="h2j-q" type="range" min="0.4" max="1" step="0.05" value={quality} onChange={(e) => setQuality(e.target.value)} disabled={busy} />
            </div>
          )}
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Converting…" : "Convert"}
        </button>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          <img src={result.url} alt="Converted preview" style={{ maxWidth: "100%", height: "auto", borderRadius: 8, marginTop: 8 }} />
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      <p className="tool-note">HEIC is Apple's photo format. This converts it to a universally-viewable JPG or PNG, entirely in your browser — your photo is never uploaded.</p>
    </div>
  );
}
