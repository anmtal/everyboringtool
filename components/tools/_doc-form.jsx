"use client";

// Shared shell for document/template generators (privacy policy, NDA, bill of
// sale). A tool supplies its `fields` and a `build(values)` that returns the
// finished document text. The form and the document are handled entirely in the
// browser — nothing is uploaded. Includes a not-legal-advice disclaimer.
import { useState, useEffect } from "react";

export default function DocForm({ fields, build, actionLabel = "Generate document", downloadName = "document.txt", disclaimer }) {
  const [values, setValues] = useState(() => Object.fromEntries(fields.map((f) => [f.name, f.type === "checkbox" ? !!f.default : (f.default || "")])));
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);
  const [dlUrl, setDlUrl] = useState("");

  const set = (n, v) => { setValues((o) => ({ ...o, [n]: v })); };

  useEffect(() => {
    if (!output) { setDlUrl(""); return; }
    const u = URL.createObjectURL(new Blob([output], { type: "text/plain" }));
    setDlUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [output]);

  function gen() { setCopied(false); setOutput(build(values)); }
  function copy() { navigator.clipboard?.writeText(output).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); }).catch(() => {}); }

  return (
    <div className="tool">
      <div className="tool-fields">
        {fields.map((f) => (
          <div className="tool-field" key={f.name}>
            {f.type !== "checkbox" && <label className="tool-label" htmlFor={"df-" + f.name}>{f.label}</label>}
            {f.type === "textarea" ? (
              <textarea id={"df-" + f.name} className="tool-input" style={{ minHeight: 70 }} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
            ) : f.type === "checkbox" ? (
              <label style={{ display: "flex", gap: 8, alignItems: "center", cursor: "pointer" }}>
                <input type="checkbox" checked={!!values[f.name]} onChange={(e) => set(f.name, e.target.checked)} />
                <span>{f.label}</span>
              </label>
            ) : (
              <input id={"df-" + f.name} className="tool-input" type={f.type || "text"} value={values[f.name]} onChange={(e) => set(f.name, e.target.value)} placeholder={f.placeholder} />
            )}
          </div>
        ))}
      </div>

      {disclaimer && <p className="tool-note tool-disclaimer" role="note">{disclaimer}</p>}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={gen}>{actionLabel}</button>
      </div>

      {output && (
        <div className="tool-field" style={{ marginTop: 8 }}>
          <label className="tool-label" htmlFor="df-out">Your document</label>
          <textarea id="df-out" readOnly className="tool-input" style={{ minHeight: 280, fontSize: 13, fontFamily: "ui-monospace, monospace" }} value={output} />
          <div className="tool-actions" style={{ marginTop: 8 }}>
            <button type="button" className="btn" onClick={copy}>{copied ? "Copied ✓" : "Copy"}</button>
            {dlUrl && <a className="btn btn-success" href={dlUrl} download={downloadName}>↓ Download .txt</a>}
          </div>
        </div>
      )}
    </div>
  );
}
