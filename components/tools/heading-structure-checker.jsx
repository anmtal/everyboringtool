"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE = `<h1>How to Bake Sourdough Bread</h1>
<p>Intro paragraph…</p>
<h2>Ingredients</h2>
<h3>For the Starter</h3>
<h3>For the Dough</h3>
<h2>Method</h2>
<h4>Day 1: Feed the Starter</h4>
<h3>Day 2: Mix and Fold</h3>
<h2>Storage Tips</h2>
<h2></h2>`;

// Pull headings out of an HTML string, in document order, without executing it.
function extractHeadings(html) {
  const out = [];
  const re = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let m;
  while ((m = re.exec(html)) !== null) {
    const level = parseInt(m[1], 10);
    // Strip nested tags, collapse whitespace, decode a few common entities.
    let text = m[2]
      .replace(/<[^>]*>/g, " ")
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/\s+/g, " ")
      .trim();
    out.push({ level, text });
  }
  return out;
}

function analyze(headings) {
  const issues = [];
  const nodes = headings.map((h, i) => ({ ...h, index: i, problems: [] }));

  const h1Count = nodes.filter((n) => n.level === 1).length;

  if (nodes.length === 0) {
    issues.push({ type: "error", msg: "No headings (h1–h6) were found." });
    return { nodes, issues, h1Count, empty: 0 };
  }

  if (h1Count === 0) {
    issues.push({
      type: "error",
      msg: "No H1 found. Every page should have exactly one H1 as its main title.",
    });
  } else if (h1Count > 1) {
    issues.push({
      type: "warn",
      msg: `${h1Count} H1s found. A page should usually have exactly one H1.`,
    });
    nodes.forEach((n) => {
      if (n.level === 1) n.problems.push("multiple-h1");
    });
  }

  if (nodes[0].level !== 1) {
    issues.push({
      type: "warn",
      msg: `The first heading is an H${nodes[0].level}, not an H1. The outline should start at H1.`,
    });
    nodes[0].problems.push("not-h1-first");
  }

  let prev = 0;
  let empty = 0;
  nodes.forEach((n) => {
    // Skipped level: jumping DOWN more than one level (e.g. H2 -> H4).
    if (prev !== 0 && n.level > prev + 1) {
      issues.push({
        type: "warn",
        msg: `Skipped level: H${prev} is followed by H${n.level} (H${prev + 1} was skipped).`,
      });
      n.problems.push("skip");
    }
    if (!n.text) {
      empty += 1;
      n.problems.push("empty");
    }
    prev = n.level;
  });

  if (empty > 0) {
    issues.push({
      type: "warn",
      msg: `${empty} empty heading${empty > 1 ? "s" : ""} found (no text inside the tag).`,
    });
  }

  if (issues.length === 0) {
    issues.push({ type: "ok", msg: "No structural problems detected. Nice, clean outline." });
  }

  return { nodes, issues, h1Count, empty };
}

export default function HeadingStructureChecker() {
  const [html, setHtml] = useState(EXAMPLE);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => analyze(extractHeadings(html)), [html]);
  const { nodes, issues, h1Count, empty } = result;

  const hasInput = html.trim().length > 0;
  const hasHeadings = nodes.length > 0;

  const outlineText = useMemo(
    () =>
      nodes
        .map((n) => `${"  ".repeat(n.level - 1)}H${n.level}: ${n.text || "(empty)"}`)
        .join("\n"),
    [nodes]
  );

  const copyOutline = async () => {
    await copyText(outlineText);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="hsc-html">
            Paste your HTML (or just the headings)
          </label>
          <textarea
            id="hsc-html"
            className="tool-textarea"
            value={html}
            onChange={(e) => setHtml(e.target.value)}
            placeholder="Paste page HTML here, e.g. <h1>Title</h1> <h2>Section</h2>…"
            rows={12}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn btn-primary"
          onClick={copyOutline}
          disabled={!hasHeadings}
        >
          {copied ? "Copied!" : "Copy outline"}
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setHtml("")}
          disabled={!hasInput}
        >
          Clear
        </button>
      </div>

      {!hasInput ? (
        <p className="tool-note">
          Paste some HTML above to check its heading structure. The tool finds every
          h1–h6, draws the outline, and flags a missing H1, multiple H1s, skipped
          levels, and empty headings.
        </p>
      ) : (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{nodes.length}</div>
              <div className="tool-stat-label">Headings</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{h1Count}</div>
              <div className="tool-stat-label">H1 count</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{empty}</div>
              <div className="tool-stat-label">Empty</div>
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Issues</p>
            {issues.map((iss, i) => (
              <div
                key={i}
                className="tool-result-value"
                style={{
                  fontSize: "0.95rem",
                  lineHeight: 1.4,
                  marginBottom: i === issues.length - 1 ? 0 : "0.4rem",
                }}
              >
                {iss.type === "error" ? "✕ " : iss.type === "warn" ? "! " : "✓ "}
                {iss.msg}
              </div>
            ))}
          </div>

          {hasHeadings ? (
            <div className="tool-output" aria-label="Heading outline">
              {nodes.map((n) => {
                const flagged = n.problems.length > 0;
                return (
                  <div
                    key={n.index}
                    style={{
                      paddingLeft: `${(n.level - 1) * 1.5}rem`,
                      padding: "0.15rem 0",
                      paddingInlineStart: `${(n.level - 1) * 1.5}rem`,
                    }}
                  >
                    <span style={{ opacity: 0.55, fontWeight: 600, marginRight: "0.5rem" }}>
                      H{n.level}
                    </span>
                    <span style={{ fontWeight: n.level <= 2 ? 600 : 400 }}>
                      {n.text || "(empty heading)"}
                    </span>
                    {flagged ? (
                      <span style={{ opacity: 0.7 }}>
                        {"  "}
                        {n.problems.includes("empty") ? " ⚠ empty" : ""}
                        {n.problems.includes("skip") ? " ⚠ skipped level" : ""}
                        {n.problems.includes("multiple-h1") ? " ⚠ extra H1" : ""}
                        {n.problems.includes("not-h1-first") ? " ⚠ should be H1" : ""}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          ) : (
            <p className="tool-note">
              No h1–h6 tags were found in what you pasted. Make sure you copied the
              rendered HTML (the tool reads real &lt;h1&gt;…&lt;h6&gt; tags).
            </p>
          )}
        </>
      )}

      <p className="tool-note">
        A good outline starts with a single H1 and never skips a level (H2 should
        follow H1, H3 should follow H2, and so on). This checker reads the raw
        &lt;h1&gt;–&lt;h6&gt; tags in the HTML you paste — it does not fetch or render
        pages, so nothing you paste leaves your browser.
      </p>
    </div>
  );
}
