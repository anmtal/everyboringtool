"use client";

import { useState, useMemo, useCallback } from "react";
import { marked } from "marked";
import DOMPurify from "dompurify";

const SAMPLE = `# Markdown to HTML

Type **Markdown** on the left and get clean HTML.

- Bullet lists
- [Links](https://everyboringtool.vercel.app)
- \`inline code\`

> Block quotes work too.

1. Numbered
2. Lists
`;

export default function MarkdownToHtml() {
  const [md, setMd] = useState(SAMPLE);
  const [view, setView] = useState("preview");
  const [copied, setCopied] = useState(false);

  // Markdown allows raw HTML, so marked's output is untrusted. Sanitize before it
  // is rendered into this page AND before the user copies it for their own site.
  const html = useMemo(() => {
    try {
      const raw = marked.parse(md || "", { gfm: true, breaks: true });
      return DOMPurify.sanitize(raw, { USE_PROFILES: { html: true } });
    } catch {
      return "";
    }
  }, [md]);

  const copy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(html);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch { /* ignore */ }
  }, [html]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="md-in">Markdown</label>
          <textarea id="md-in" className="tool-textarea" value={md} onChange={(e) => setMd(e.target.value)} rows={10} spellCheck={false} placeholder="# Type markdown here…" />
        </div>
      </div>

      <div className="tool-actions" role="tablist" aria-label="Output view">
        <button type="button" className={view === "preview" ? "btn btn-primary" : "btn"} onClick={() => setView("preview")} role="tab" aria-selected={view === "preview"}>Preview</button>
        <button type="button" className={view === "html" ? "btn btn-primary" : "btn"} onClick={() => setView("html")} role="tab" aria-selected={view === "html"}>HTML source</button>
        <button type="button" className={copied ? "btn btn-success" : "btn"} onClick={copy}>{copied ? "Copied!" : "Copy HTML"}</button>
      </div>

      {view === "preview" ? (
        <div
          className="tool-result"
          style={{ background: "#ffffff", color: "#1a1a1a", padding: "14px 18px", borderRadius: 10, lineHeight: 1.55, overflowX: "auto" }}
          dangerouslySetInnerHTML={{ __html: html }}
        />
      ) : (
        <pre className="tool-output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word" }}>{html}</pre>
      )}

      <p className="tool-note">Converts Markdown (GitHub-flavored) to clean HTML instantly, entirely in your browser. Nothing you type is uploaded. Preview renders on a white card so it looks the same as it will on your site.</p>
    </div>
  );
}
