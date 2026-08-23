"use client";

import { useState, useRef, useCallback } from "react";

export default function ImageToText() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState("");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [text, setText] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setText("");
    if (!f.type.startsWith("image/")) { setError("Please choose an image file."); return; }
    setFile(f);
    setPreview(URL.createObjectURL(f));
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setText(""); setProgress(0);
    let worker;
    try {
      const { createWorker } = await import("tesseract.js");
      setStatus("Loading OCR engine (first run downloads a language model)…");
      // tesseract.js swallows failures in its loadLanguage/initialize chain, so a
      // failed CDN download leaves this promise pending forever and the tool spins
      // with no error. Race it so the user always gets an outcome.
      worker = await Promise.race([
        createWorker("eng", 1, {
          logger: (m) => {
            if (m.status) setStatus(m.status.replace(/(^|\s)\w/g, (c) => c.toUpperCase()));
            if (typeof m.progress === "number") setProgress(Math.round(m.progress * 100));
          },
        }),
        new Promise((_, reject) =>
          setTimeout(() => reject(new Error("ocr-load-timeout")), 60000)
        ),
      ]);
      setStatus("Reading text…");
      const { data } = await worker.recognize(file);
      const out = (data.text || "").trim();
      setText(out);
      if (!out) setError("No readable text was found. Try a clearer, higher-contrast image.");
      setStatus("");
    } catch (e) {
      setError(
        e && e.message === "ocr-load-timeout"
          ? "The text-recognition engine took too long to download. Check your connection and try again — it's about 4 MB the first time, and it's cached afterwards."
          : "Couldn't read the image — please try again with a clearer picture."
      );
      setStatus("");
    } finally {
      if (worker) { try { await worker.terminate(); } catch { /* ignore */ } }
      setBusy(false); setProgress(0);
    }
  }, [file]);

  const copy = useCallback(async () => {
    if (!text) return;
    try { await navigator.clipboard.writeText(text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }, [text]);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
      >
        <input ref={inputRef} type="file" accept="image/*" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose an image"}</p>
        <p className="dropzone-sub">A screenshot, photo of a document, sign, receipt… — nothing uploaded</p>
      </div>

      {preview && (
        <img src={preview} alt="Selected" style={{ maxWidth: "100%", maxHeight: 220, borderRadius: 8, marginTop: 4 }} />
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Reading…" : "Extract text"}
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

      {text && (
        <>
          <div className="tool-actions">
            <button type="button" className={copied ? "btn btn-success" : "btn btn-primary"} onClick={copy}>{copied ? "Copied!" : "Copy text"}</button>
          </div>
          <pre className="tool-output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{text}</pre>
        </>
      )}

      <p className="tool-note">
        Extracts text from an image (OCR) right in your browser — your image is never uploaded. The first run downloads
        the OCR engine and English model once, then it's cached. Works best on clear, high-contrast text.
      </p>
    </div>
  );
}
