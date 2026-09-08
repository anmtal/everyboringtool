"use client";

import { useState, useRef, useCallback, useEffect } from "react";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function HeicToPng() {
  const [files, setFiles] = useState([]);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState("");
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const inputRef = useRef(null);

  // Release output blob URLs when results change or the component unmounts, so
  // re-running the tool doesn't pin every previous PNG in memory for the tab's life.
  useEffect(() => {
    return () => {
      results.forEach((r) => r.url && URL.revokeObjectURL(r.url));
    };
  }, [results]);

  function onPick(e) {
    const picked = Array.from(e.target.files || []);
    e.target.value = "";
    if (!picked.length) return;
    setError("");
    setResults([]);
    const valid = picked.filter(
      (f) => /\.(heic|heif)$/i.test(f.name) || /hei[cf]/i.test(f.type)
    );
    if (!valid.length) {
      setError("Please choose one or more HEIC or HEIF files (the format iPhones use).");
      return;
    }
    if (valid.length < picked.length) {
      setError(`Skipped ${picked.length - valid.length} non-HEIC file(s). Kept ${valid.length}.`);
    }
    setFiles(valid);
  }

  const run = useCallback(async () => {
    if (!files.length) return;
    setBusy(true);
    setError("");
    setResults([]);
    setProgress("");
    try {
      const heic2any = (await import("heic2any")).default;
      const out = [];
      const failed = [];
      for (let i = 0; i < files.length; i++) {
        const f = files[i];
        setProgress(`Converting ${i + 1} of ${files.length}: ${f.name}`);
        try {
          const res = await heic2any({ blob: f, toType: "image/png" });
          const blob = Array.isArray(res) ? res[0] : res;
          const base = f.name.replace(/\.[^.]+$/, "") || "image";
          out.push({
            url: URL.createObjectURL(blob),
            name: `${base}.png`,
            size: blob.size,
            blob,
          });
        } catch {
          failed.push(f.name);
        }
      }
      setResults(out);
      if (failed.length) {
        setError(
          `Couldn't convert ${failed.length} file(s): ${failed.join(", ")}. They may not be valid HEIC images or are too large for the browser.`
        );
      }
      if (!out.length && !failed.length) {
        setError("Nothing was converted.");
      }
    } catch {
      setError("Something went wrong while converting. Try fewer or smaller files.");
    } finally {
      setBusy(false);
      setProgress("");
    }
  }, [files]);

  const downloadZip = useCallback(async () => {
    if (results.length < 2) return;
    setBusy(true);
    try {
      const JSZip = (await import("jszip")).default;
      const zip = new JSZip();
      const seen = {};
      results.forEach((r) => {
        let name = r.name;
        if (seen[name]) {
          const dot = name.lastIndexOf(".");
          name = `${name.slice(0, dot)}-${seen[r.name]}${name.slice(dot)}`;
        }
        seen[r.name] = (seen[r.name] || 0) + 1;
        zip.file(name, r.blob);
      });
      const content = await zip.generateAsync({ type: "blob" });
      const url = URL.createObjectURL(content);
      const a = document.createElement("a");
      a.href = url;
      a.download = "heic-to-png.zip";
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      setError("Couldn't build the ZIP file. You can still download each PNG individually.");
    } finally {
      setBusy(false);
    }
  }, [results]);

  const totalIn = files.reduce((s, f) => s + f.size, 0);
  const totalOut = results.reduce((s, r) => s + r.size, 0);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) =>
          (e.key === "Enter" || e.key === " ") &&
          !busy &&
          (e.preventDefault(), inputRef.current?.click())
        }
      >
        <input
          ref={inputRef}
          type="file"
          accept=".heic,.heif,image/heic,image/heif"
          multiple
          onChange={onPick}
          hidden
        />
        <p className="dropzone-title">
          {files.length
            ? `${files.length} file${files.length > 1 ? "s" : ""} selected`
            : "Choose HEIC files"}
        </p>
        <p className="dropzone-sub">
          {files.length
            ? fmtBytes(totalIn) + " — nothing uploaded, converts on your device"
            : "Pick one or many .heic / .heif photos from your iPhone"}
        </p>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={run}
          disabled={!files.length || busy}
        >
          {busy && progress ? "Converting…" : `Convert to PNG${files.length > 1 ? ` (${files.length})` : ""}`}
        </button>
        {results.length > 1 && (
          <button
            type="button"
            className="btn btn-success"
            onClick={downloadZip}
            disabled={busy}
          >
            ↓ Download all as ZIP
          </button>
        )}
      </div>

      {busy && progress && (
        <p className="tool-note" role="status" aria-live="polite">
          {progress}
        </p>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {results.length > 0 && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">
            Converted {results.length} image{results.length > 1 ? "s" : ""} — {fmtBytes(totalOut)} total
          </p>
          {results.map((r, i) => (
            <div
              key={i}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                marginTop: 10,
                flexWrap: "wrap",
              }}
            >
              <img
                src={r.url}
                alt={`Converted ${r.name}`}
                style={{ width: 64, height: 64, objectFit: "cover", borderRadius: 8 }}
              />
              <span className="tool-result-value" style={{ flex: 1, minWidth: 120, wordBreak: "break-all" }}>
                {r.name} — {fmtBytes(r.size)}
              </span>
              <a className="btn btn-success" href={r.url} download={r.name}>
                ↓ PNG
              </a>
            </div>
          ))}
        </div>
      )}

      {!files.length && !results.length && (
        <p className="tool-note">
          Select the HEIC photos your iPhone or iPad saved and this converts them to
          standard PNG images that open anywhere — Windows, older Androids, editors and
          websites that reject HEIC.
        </p>
      )}

      <p className="tool-note">
        HEIC (also written HEIF) is Apple&apos;s high-efficiency photo format. PNG is
        lossless, so no quality is lost in the conversion. Everything runs inside your
        browser using the heic2any decoder — your photos are never uploaded to a server.
      </p>
    </div>
  );
}
