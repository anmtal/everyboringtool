"use client";

import { useState } from "react";

function fmtVal(v) {
  if (v == null) return "";
  if (v instanceof Date) return isNaN(v.getTime()) ? "" : v.toLocaleString();
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") { try { return JSON.stringify(v); } catch { return ""; } }
  if (typeof v === "number") return Number.isInteger(v) ? String(v) : v.toFixed(5).replace(/0+$/, "").replace(/\.$/, "");
  return String(v);
}

export default function ExifViewer() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [rows, setRows] = useState(null);
  const [gps, setGps] = useState(null);
  const [name, setName] = useState("");

  async function onFile(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setBusy(true); setError(""); setRows(null); setGps(null); setName(f.name);
    try {
      const exifr = (await import("exifr")).default;
      const meta = await exifr.parse(f, true).catch(() => null);
      if (!meta || Object.keys(meta).length === 0) {
        setError("No EXIF metadata found. Screenshots — and photos shared through chat apps or social media — usually have their metadata removed.");
      } else {
        if (typeof meta.latitude === "number" && typeof meta.longitude === "number") setGps({ lat: meta.latitude, lon: meta.longitude });
        const entries = Object.entries(meta)
          .filter(([, v]) => v != null && typeof v !== "function")
          .map(([k, v]) => [k, fmtVal(v)])
          .filter(([, v]) => v !== "");
        entries.sort((a, b) => a[0].localeCompare(b[0]));
        setRows(entries);
      }
    } catch {
      setError("Couldn't read metadata from that file.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="ex-file">Choose a photo</label>
        <input id="ex-file" className="tool-input" type="file" accept="image/*" onChange={onFile} disabled={busy} />
        <p className="tool-note">Read entirely in your browser — your photo is never uploaded, which is safer than sites that read metadata on a server.</p>
      </div>

      {busy && <p className="tool-note" aria-live="polite">Reading metadata…</p>}
      {error && <p className="tool-error" role="alert">{error}</p>}

      {gps && (
        <p className="tool-note" style={{ marginTop: 8 }}>
          📍 This photo contains GPS coordinates: {gps.lat.toFixed(5)}, {gps.lon.toFixed(5)} —{" "}
          <a href={`https://www.google.com/maps?q=${gps.lat},${gps.lon}`} target="_blank" rel="noopener noreferrer" style={{ textDecoration: "underline" }}>view on a map</a>.
        </p>
      )}

      {rows && rows.length > 0 && (
        <div style={{ marginTop: 8 }}>
          <p className="tool-result-label">Metadata in {name} ({rows.length} fields)</p>
          {rows.map(([k, v], i) => (
            <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: "1px dashed var(--border)", fontSize: 13 }}>
              <span style={{ color: "var(--muted, #888)" }}>{k}</span>
              <span style={{ fontFamily: "ui-monospace, monospace", textAlign: "right", wordBreak: "break-word", maxWidth: "62%" }}>{v}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
