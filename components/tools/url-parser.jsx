"use client";

import { useState } from "react";

function parse(raw) {
  const s = raw.trim();
  if (!s) return { parsed: null, err: "" };
  let u, assumed = false;
  try { u = new URL(s); }
  catch {
    try { u = new URL("https://" + s); assumed = true; }
    catch { return { parsed: null, err: "That isn't a valid URL." }; }
  }
  return {
    err: "",
    assumed,
    parsed: {
      protocol: u.protocol.replace(/:$/, ""),
      hostname: u.hostname,
      port: u.port || "(default)",
      path: u.pathname || "/",
      query: u.search || "(none)",
      hash: u.hash || "(none)",
      origin: u.origin,
      params: [...u.searchParams.entries()],
    },
  };
}

export default function UrlParser() {
  const [url, setUrl] = useState("");
  const { parsed, err, assumed } = parse(url);

  const Row = ({ label, value }) => (
    <div style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "6px 0", borderBottom: "1px dashed var(--border)", fontSize: 14 }}>
      <span className="tool-note" style={{ margin: 0 }}>{label}</span>
      <span style={{ fontFamily: "ui-monospace, monospace", textAlign: "right", wordBreak: "break-all" }}>{value}</span>
    </div>
  );

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="up-url">Paste a URL</label>
        <input id="up-url" className="tool-input" type="text" value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://example.com/path?utm_source=news&id=42#section" spellCheck={false} />
        <p className="tool-note">Parsed in your browser — nothing is uploaded.</p>
      </div>

      {err && <p className="tool-error" role="alert">{err}</p>}

      {parsed && (
        <div style={{ marginTop: 8 }}>
          {assumed && <p className="tool-note">No scheme given — assumed <code>https://</code>.</p>}
          <Row label="Protocol" value={parsed.protocol} />
          <Row label="Host" value={parsed.hostname} />
          <Row label="Port" value={parsed.port} />
          <Row label="Path" value={parsed.path} />
          <Row label="Query string" value={parsed.query} />
          <Row label="Fragment (#)" value={parsed.hash} />
          <Row label="Origin" value={parsed.origin} />

          {parsed.params.length > 0 && (
            <div style={{ marginTop: 12 }}>
              <p className="tool-result-label">Query parameters ({parsed.params.length})</p>
              {parsed.params.map(([k, v], i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", gap: 12, padding: "5px 0", borderBottom: "1px dashed var(--border)", fontSize: 13, fontFamily: "ui-monospace, monospace" }}>
                  <span style={{ color: "var(--muted, #888)" }}>{k}</span>
                  <span style={{ textAlign: "right", wordBreak: "break-all" }}>{v || "(empty)"}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
