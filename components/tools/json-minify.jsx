"use client";

import { useState, useEffect } from "react";

export default function JsonMinify() {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [dlUrl, setDlUrl] = useState("");

  useEffect(() => {
    if (!output) { setDlUrl(""); return; }
    const url = URL.createObjectURL(new Blob([output], { type: "application/json" }));
    setDlUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [output]);

  function run(pretty) {
    setError(""); setCopied(false);
    const s = input.trim();
    if (!s) { setError("Paste some JSON first."); setOutput(""); return; }
    try {
      const obj = JSON.parse(s);
      setOutput(pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj));
    } catch {
      setOutput("");
      setError("That isn't valid JSON — check for a missing comma, quote or bracket.");
    }
  }
  function copy() {
    navigator.clipboard?.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {});
  }

  const saved = input && output ? Math.max(0, input.length - output.length) : 0;

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="jm-in">Paste your JSON</label>
        <textarea id="jm-in" className="tool-input" style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={input} onChange={(e) => setInput(e.target.value)} placeholder={'{ "name": "Ada", "roles": ["engineer", "writer"] }'} spellCheck={false} />
        <p className="tool-note">Everything happens in your browser — nothing is uploaded.</p>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={() => run(false)} disabled={!input.trim()}>Minify</button>
        <button type="button" className="btn" onClick={() => run(true)} disabled={!input.trim()}>Beautify</button>
      </div>

      {error && <p className="tool-error" role="alert">{error}</p>}

      {output && (
        <div className="tool-field" style={{ marginTop: 8 }}>
          <label className="tool-label" htmlFor="jm-out">Result{saved > 0 ? ` — ${saved} characters smaller` : ""}</label>
          <textarea id="jm-out" readOnly className="tool-input" style={{ minHeight: 160, fontFamily: "ui-monospace, monospace", fontSize: 13 }} value={output} spellCheck={false} />
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            {dlUrl && <a className="btn btn-success" href={dlUrl} download="data.json">↓ Download .json</a>}
          </div>
        </div>
      )}
    </div>
  );
}
