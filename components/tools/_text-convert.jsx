"use client";

// Shared shell for text-in / text-out converters (XML/JSON/CSV). A tool supplies
// transform(input) -> string (throwing an Error with a friendly message on bad
// input). All parsing is done in the browser — nothing is uploaded.
import { useState, useEffect } from "react";

export default function TextConvert({
  inLabel = "Input",
  outLabel = "Output",
  placeholder = "",
  transform,
  actionLabel = "Convert",
  downloadName = "output.txt",
  downloadMime = "text/plain",
}) {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dlUrl, setDlUrl] = useState("");

  useEffect(() => {
    if (!output) { setDlUrl(""); return; }
    const url = URL.createObjectURL(new Blob([output], { type: downloadMime }));
    setDlUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output, downloadMime]);

  function run() {
    setError(""); setCopied(false);
    try {
      const out = transform(input);
      setOutput(out);
    } catch (e) {
      setOutput("");
      setError((e && e.message) || "Couldn't convert — check the input format.");
    }
  }
  function copy() {
    if (!output) return;
    navigator.clipboard?.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="tc-in">{inLabel}</label>
        <textarea id="tc-in" className="tool-input" style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder={placeholder} spellCheck={false} />
        <p className="tool-note">Everything is converted in your browser — nothing is uploaded.</p>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!input.trim()}>{actionLabel}</button>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {output && (
        <div className="tool-field" style={{ marginTop: 8 }}>
          <label className="tool-label" htmlFor="tc-out">{outLabel}</label>
          <textarea id="tc-out" readOnly className="tool-input" style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={output} spellCheck={false} />
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            {dlUrl && <a className="btn btn-success" href={dlUrl} download={downloadName}>↓ Download</a>}
          </div>
        </div>
      )}
    </div>
  );
}
