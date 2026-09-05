"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { encryptPDF } from "@pdfsmaller/pdf-encrypt";

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

export default function ProtectPdf() {
  const [file, setFile] = useState(null);
  const [password, setPassword] = useState("");
  const [show, setShow] = useState(false);
  const [restrict, setRestrict] = useState(false);
  const [ownerPassword, setOwnerPassword] = useState("");
  const [perms, setPerms] = useState({ allowPrinting: true, allowCopying: true, allowModifying: true });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  // Release the previous output blob. React runs this cleanup before the next
  // effect, so re-running a tool frees the old result instead of pinning it.
  useEffect(() => {
    return () => {
      if (result && result.url) URL.revokeObjectURL(result.url);
    };
  }, [result]);

  // Any change to the password or permissions invalidates an existing download.
  // Leaving it on screen let people hand out a PDF locked with the password they
  // had just replaced, believing it used the new one.
  useEffect(() => {
    setResult(null);
  }, [password, ownerPassword, restrict, perms]);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!/\.pdf$/i.test(f.name) && f.type !== "application/pdf") { setError("Please choose a PDF file."); return; }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    if (!password && !(restrict && ownerPassword)) {
      setError("Enter a password to protect the PDF.");
      return;
    }
    setBusy(true); setError(""); setResult(null);
    try {
      const bytes = new Uint8Array(await file.arrayBuffer());
      const opts = { algorithm: "AES-256" };
      if (restrict) {
        opts.ownerPassword = ownerPassword || password;
        opts.allowPrinting = perms.allowPrinting;
        opts.allowHighQualityPrint = perms.allowPrinting;
        opts.allowCopying = perms.allowCopying;
        opts.allowExtraction = perms.allowCopying;
        opts.allowModifying = perms.allowModifying;
        opts.allowAnnotating = perms.allowModifying;
        opts.allowFillingForms = perms.allowModifying;
        opts.allowAssembly = perms.allowModifying;
      }
      const enc = await encryptPDF(bytes, password, opts);
      const blob = new Blob([enc], { type: "application/pdf" });
      const base = file.name.replace(/\.pdf$/i, "") || "document";
      setResult({ url: URL.createObjectURL(blob), name: `${base}-protected.pdf`, size: blob.size });
    } catch (e) {
      if (e && e.code === "ALREADY_ENCRYPTED") setError("This PDF is already password-protected. Unlock it first, then protect it again.");
      else if (e && e.name === "PasswordEncodingError") setError("That password contains characters that can't be used. Stick to letters, numbers and common symbols.");
      else setError("Couldn't protect this PDF — it may be corrupted or an unsupported file.");
    } finally {
      setBusy(false);
    }
  }, [file, password, restrict, ownerPassword, perms]);

  const togglePerm = (k) => setPerms((p) => ({ ...p, [k]: !p[k] }));

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="application/pdf" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose a PDF file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing uploaded" : "Add an AES-256 password, in your browser"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pp-pass">Password to open the PDF</label>
          <div style={{ display: "flex", gap: 8 }}>
            <input id="pp-pass" className="tool-input" type={show ? "text" : "password"} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Choose a password…" style={{ flex: 1 }} disabled={busy} autoComplete="new-password" />
            <button type="button" className="btn" onClick={() => setShow((s) => !s)} disabled={busy}>{show ? "Hide" : "Show"}</button>
          </div>
          <p className="tool-note" style={{ margin: "4px 0 0" }}>Anyone opening the PDF will need this password. Keep it somewhere safe — it can't be recovered.</p>
        </div>

        <label className="tool-note" style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
          <input type="checkbox" checked={restrict} onChange={(e) => setRestrict(e.target.checked)} disabled={busy} />
          Also restrict what viewers can do (printing, copying, editing)
        </label>

        {restrict && (
          <div className="tool-fields" style={{ borderLeft: "2px solid rgba(128,128,128,0.3)", paddingLeft: 12, marginLeft: 2 }}>
            <div className="tool-field">
              <label className="tool-label" htmlFor="pp-owner">Owner password (to change permissions)</label>
              <input id="pp-owner" className="tool-input" type={show ? "text" : "password"} value={ownerPassword} onChange={(e) => setOwnerPassword(e.target.value)} placeholder="Defaults to the open password" disabled={busy} autoComplete="new-password" />
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: 14 }}>
              {[["allowPrinting", "Allow printing"], ["allowCopying", "Allow copying text"], ["allowModifying", "Allow editing"]].map(([k, label]) => (
                <label key={k} className="tool-note" style={{ display: "flex", gap: 6, alignItems: "center", cursor: "pointer", margin: 0 }}>
                  <input type="checkbox" checked={perms[k]} onChange={() => togglePerm(k)} disabled={busy} />
                  {label}
                </label>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Protecting…" : "Protect PDF"}
        </button>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">🔒 Protected with AES-256 — {fmtBytes(result.size)}</p>
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      <p className="tool-note">
        Adds strong AES-256 password protection to a PDF, entirely in your browser — your file and password never leave
        your device. There's no way to recover a lost password, so store it safely.
      </p>
    </div>
  );
}
