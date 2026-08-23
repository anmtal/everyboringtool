"use client";

import { useMemo, useState } from "react";

// A single blank link row. Section lets you group links under a ## heading.
function emptyLink() {
  return { section: "", title: "", url: "", note: "" };
}

export default function LlmsTxtGenerator() {
  const [name, setName] = useState("");
  const [summary, setSummary] = useState("");
  const [links, setLinks] = useState([
    { section: "Docs", title: "", url: "", note: "" },
  ]);
  const [copied, setCopied] = useState(false);

  const { output, linkCount, sectionCount, charCount } = useMemo(() => {
    const safeName = name.trim() || "Untitled Project";
    const lines = [];

    // H1 project/site name.
    lines.push("# " + safeName);

    // Optional blockquote summary. Multi-line summaries get "> " on each line.
    const cleanSummary = summary.trim();
    if (cleanSummary) {
      lines.push("");
      cleanSummary.split(/\r?\n/).forEach((row) => {
        const r = row.trim();
        lines.push(r ? "> " + r : ">");
      });
    }

    // Keep only rows that have a usable URL. Title falls back to the URL.
    const usable = links
      .map((l) => ({
        section: (l.section || "").trim(),
        title: (l.title || "").trim(),
        url: (l.url || "").trim(),
        note: (l.note || "").trim(),
      }))
      .filter((l) => l.url !== "");

    // Group links by section, preserving first-seen order of sections.
    const order = [];
    const bySection = {};
    usable.forEach((l) => {
      const sec = l.section || "Links";
      if (!bySection[sec]) {
        bySection[sec] = [];
        order.push(sec);
      }
      bySection[sec].push(l);
    });

    order.forEach((sec) => {
      lines.push("");
      lines.push("## " + sec);
      lines.push("");
      bySection[sec].forEach((l) => {
        const label = l.title || l.url;
        let entry = "- [" + label + "](" + l.url + ")";
        if (l.note) entry += ": " + l.note;
        lines.push(entry);
      });
    });

    const text = lines.join("\n") + "\n";

    return {
      output: text,
      linkCount: usable.length,
      sectionCount: order.length,
      charCount: text.length,
    };
  }, [name, summary, links]);

  // Warn about link rows that were typed but have no URL yet (so they're skipped).
  const skippedRows = useMemo(
    () =>
      links.filter((l) => {
        const hasContent =
          (l.title || "").trim() !== "" ||
          (l.note || "").trim() !== "" ||
          (l.section || "").trim() !== "";
        return hasContent && (l.url || "").trim() === "";
      }).length,
    [links]
  );

  function updateLink(index, field, value) {
    const next = links.slice();
    next[index] = { ...next[index], [field]: value };
    setLinks(next);
  }

  function addLink() {
    // Reuse the previous row's section so consecutive links group naturally.
    const prev = links[links.length - 1];
    const seed = emptyLink();
    if (prev && (prev.section || "").trim()) seed.section = prev.section;
    setLinks(links.concat(seed));
  }

  function removeLink(index) {
    const next = links.filter((_, i) => i !== index);
    setLinks(next.length ? next : [emptyLink()]);
  }

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([output], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "llms.txt";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setName("");
    setSummary("");
    setLinks([{ section: "Docs", title: "", url: "", note: "" }]);
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ltg-name">
            Site or project name
          </label>
          <input
            className="tool-input"
            id="ltg-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Acme Docs"
          />
          <p className="tool-note">
            Becomes the H1 at the top of your <code>llms.txt</code>. This is the
            one line every LLM reads first.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ltg-summary">
            Short summary (optional)
          </label>
          <textarea
            className="tool-textarea"
            id="ltg-summary"
            rows={3}
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            placeholder="A one or two sentence description of what this project is and who it's for."
          />
          <p className="tool-note">
            Rendered as a Markdown blockquote (<code>&gt;</code>) right under the
            title. Keep it tight and factual.
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label">Important links</label>
          <p className="tool-note">
            Each link is grouped under a <code>##</code> section heading. Give a
            few links the same section name to list them together.
          </p>
          {links.map((link, i) => (
            <div
              key={"link-" + i}
              style={{
                border: "1px solid rgba(128,128,128,0.3)",
                borderRadius: "8px",
                padding: "12px",
                marginBottom: "12px",
              }}
            >
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor={"ltg-sec-" + i}>
                    Section
                  </label>
                  <input
                    className="tool-input"
                    id={"ltg-sec-" + i}
                    type="text"
                    value={link.section}
                    onChange={(e) => updateLink(i, "section", e.target.value)}
                    placeholder="Docs"
                  />
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor={"ltg-title-" + i}>
                    Title
                  </label>
                  <input
                    className="tool-input"
                    id={"ltg-title-" + i}
                    type="text"
                    value={link.title}
                    onChange={(e) => updateLink(i, "title", e.target.value)}
                    placeholder="Getting Started"
                  />
                </div>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor={"ltg-url-" + i}>
                  URL
                </label>
                <input
                  className="tool-input"
                  id={"ltg-url-" + i}
                  type="text"
                  value={link.url}
                  onChange={(e) => updateLink(i, "url", e.target.value)}
                  placeholder="https://example.com/docs/getting-started"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor={"ltg-note-" + i}>
                  Note (optional)
                </label>
                <input
                  className="tool-input"
                  id={"ltg-note-" + i}
                  type="text"
                  value={link.note}
                  onChange={(e) => updateLink(i, "note", e.target.value)}
                  placeholder="Install and first-run walkthrough"
                />
              </div>
              <div className="tool-actions">
                <button
                  className="btn"
                  type="button"
                  onClick={() => removeLink(i)}
                  aria-label={"Remove link " + (i + 1)}
                >
                  Remove link
                </button>
              </div>
            </div>
          ))}
          <div className="tool-actions">
            <button className="btn" type="button" onClick={addLink}>
              + Add link
            </button>
          </div>
          {skippedRows > 0 ? (
            <p className="tool-error">
              {skippedRows} link{skippedRows === 1 ? "" : "s"} without a URL{" "}
              {skippedRows === 1 ? "is" : "are"} skipped. Add a URL to include{" "}
              {skippedRows === 1 ? "it" : "them"}.
            </p>
          ) : null}
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{linkCount}</div>
          <div className="tool-stat-label">links</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{sectionCount}</div>
          <div className="tool-stat-label">sections</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{charCount}</div>
          <div className="tool-stat-label">characters</div>
        </div>
      </div>

      <div className="tool-field">
        <div className="tool-actions">
          <button
            className={copied ? "btn btn-success" : "btn btn-primary"}
            type="button"
            onClick={handleCopy}
          >
            {copied ? "Copied!" : "Copy llms.txt"}
          </button>
          <button
            className="btn btn-success"
            type="button"
            onClick={handleDownload}
          >
            Download llms.txt
          </button>
          <button className="btn" type="button" onClick={handleReset}>
            Reset
          </button>
        </div>
        <label className="tool-label" htmlFor="ltg-output">
          Generated llms.txt
        </label>
        <pre className="tool-output" id="ltg-output">
          {output}
        </pre>
        <p className="tool-note">
          Save this as <code>llms.txt</code> in the root of your domain so it
          resolves at <code>https://yoursite.com/llms.txt</code>. It gives AI
          assistants a curated, Markdown map of your most important pages.
        </p>
      </div>
    </div>
  );
}
