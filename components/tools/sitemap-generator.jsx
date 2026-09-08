"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const CHANGEFREQ_OPTIONS = [
  "",
  "always",
  "hourly",
  "daily",
  "weekly",
  "monthly",
  "yearly",
  "never",
];

function escapeXml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

// Normalize one raw URL line. Returns { url, error } — url is "" when the line
// should be skipped (blank) or is invalid (error set).
function normalizeLine(raw) {
  const input = String(raw || "").trim();
  if (!input) return { url: "", error: "" };

  let candidate = input;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    // Bare domain/path like "example.com/page" — assume https.
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
      return { url: "", error: `Not a web URL: ${input}` };
    }
    candidate = "https://" + candidate;
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (e) {
    return { url: "", error: `Invalid URL: ${input}` };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return { url: "", error: `Only http/https allowed: ${input}` };
  }
  if (!parsed.hostname || parsed.hostname.indexOf(".") === -1) {
    return { url: "", error: `Needs a full domain: ${input}` };
  }

  // Lowercase scheme + host; keep path/query/hash as given (sitemaps are
  // case-sensitive in the path).
  const host = parsed.hostname.toLowerCase();
  let port = parsed.port;
  if (
    (protocol === "https:" && port === "443") ||
    (protocol === "http:" && port === "80")
  ) {
    port = "";
  }
  const authority = host + (port ? ":" + port : "");
  const url = protocol + "//" + authority + parsed.pathname + parsed.search + parsed.hash;
  return { url, error: "" };
}

function buildSitemap(urls, opts) {
  const lines = ['<?xml version="1.0" encoding="UTF-8"?>'];
  lines.push('<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">');
  for (const u of urls) {
    lines.push("  <url>");
    lines.push(`    <loc>${escapeXml(u)}</loc>`);
    if (opts.lastmod) lines.push(`    <lastmod>${escapeXml(opts.lastmod)}</lastmod>`);
    if (opts.changefreq) lines.push(`    <changefreq>${escapeXml(opts.changefreq)}</changefreq>`);
    if (opts.priority) lines.push(`    <priority>${escapeXml(opts.priority)}</priority>`);
    lines.push("  </url>");
  }
  lines.push("</urlset>");
  return lines.join("\n");
}

const EXAMPLE = `https://example.com/
https://example.com/about
https://example.com/blog
https://example.com/blog/getting-started
https://example.com/contact`;

export default function SitemapGenerator() {
  const [text, setText] = useState(EXAMPLE);
  const [changefreq, setChangefreq] = useState("weekly");
  const [priority, setPriority] = useState("0.8");
  const [useLastmod, setUseLastmod] = useState(true);
  const [lastmod, setLastmod] = useState(() => new Date().toISOString().slice(0, 10));
  const [dedupe, setDedupe] = useState(true);
  const [copied, setCopied] = useState(false);

  const parsed = useMemo(() => {
    const rawLines = text.split(/\r?\n/);
    const valid = [];
    const errors = [];
    const seen = new Set();
    let duplicates = 0;
    for (const line of rawLines) {
      const { url, error } = normalizeLine(line);
      if (error) {
        errors.push(error);
        continue;
      }
      if (!url) continue;
      if (dedupe) {
        if (seen.has(url)) {
          duplicates += 1;
          continue;
        }
        seen.add(url);
      }
      valid.push(url);
    }
    return { valid, errors, duplicates };
  }, [text, dedupe]);

  const priorityValid = useMemo(() => {
    if (!priority) return true;
    const n = Number(priority);
    return Number.isFinite(n) && n >= 0 && n <= 1;
  }, [priority]);

  const output = useMemo(() => {
    if (!parsed.valid.length) return "";
    return buildSitemap(parsed.valid, {
      changefreq,
      priority: priorityValid ? priority : "",
      lastmod: useLastmod ? lastmod : "",
    });
  }, [parsed.valid, changefreq, priority, priorityValid, useLastmod, lastmod]);

  const overLimit = parsed.valid.length > 50000;

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([output], { type: "application/xml" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "sitemap.xml";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleClear() {
    setText("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="smg-urls">
            Page URLs (one per line)
          </label>
          <textarea
            className="tool-textarea"
            id="smg-urls"
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={10}
            placeholder={"https://example.com/\nhttps://example.com/about"}
            spellCheck={false}
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="smg-changefreq">
              Change frequency
            </label>
            <select
              className="tool-select"
              id="smg-changefreq"
              value={changefreq}
              onChange={(e) => setChangefreq(e.target.value)}
            >
              {CHANGEFREQ_OPTIONS.map((opt) => (
                <option key={opt} value={opt}>
                  {opt === "" ? "(none)" : opt}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="smg-priority">
              Priority (0.0–1.0)
            </label>
            <input
              className="tool-input"
              id="smg-priority"
              type="text"
              value={priority}
              onChange={(e) => setPriority(e.target.value)}
              placeholder="0.8"
              autoComplete="off"
              spellCheck={false}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="smg-lastmod">
              Last modified
            </label>
            <input
              className="tool-input"
              id="smg-lastmod"
              type="date"
              value={lastmod}
              onChange={(e) => setLastmod(e.target.value)}
              disabled={!useLastmod}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="smg-uselastmod">
              <input
                id="smg-uselastmod"
                type="checkbox"
                checked={useLastmod}
                onChange={(e) => setUseLastmod(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Include &lt;lastmod&gt; date
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="smg-dedupe">
              <input
                id="smg-dedupe"
                type="checkbox"
                checked={dedupe}
                onChange={(e) => setDedupe(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Remove duplicate URLs
            </label>
          </div>
        </div>
      </div>

      {!priorityValid ? (
        <div className="tool-error">
          Priority must be a number between 0.0 and 1.0. It has been left out of the
          sitemap.
        </div>
      ) : null}

      {overLimit ? (
        <div className="tool-error">
          A single sitemap file can hold at most 50,000 URLs. You have{" "}
          {parsed.valid.length.toLocaleString()} — split them across multiple sitemap
          files and list those in a sitemap index.
        </div>
      ) : null}

      {output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{parsed.valid.length.toLocaleString()}</div>
              <div className="tool-stat-label">
                URL{parsed.valid.length === 1 ? "" : "s"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{parsed.duplicates}</div>
              <div className="tool-stat-label">duplicates skipped</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{parsed.errors.length}</div>
              <div className="tool-stat-label">lines skipped</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy XML"}
              </button>
              <button className="btn btn-primary" type="button" onClick={handleDownload}>
                Download sitemap.xml
              </button>
              <button className="btn" type="button" onClick={handleClear}>
                Clear
              </button>
            </div>
            <label className="tool-label" htmlFor="smg-output">
              sitemap.xml
            </label>
            <pre className="tool-output" id="smg-output">
              {output}
            </pre>
          </div>

          {parsed.errors.length ? (
            <div className="tool-note">
              {parsed.errors.slice(0, 8).map((err, i) => (
                <div key={i}>• {err}</div>
              ))}
              {parsed.errors.length > 8 ? (
                <div>• …and {parsed.errors.length - 8} more skipped line(s)</div>
              ) : null}
            </div>
          ) : null}

          <p className="tool-note">
            Save this as <strong>sitemap.xml</strong> in your site&apos;s root (so it
            lives at <code>https://yourdomain.com/sitemap.xml</code>), then submit that
            URL in Google Search Console and add a{" "}
            <code>Sitemap: https://yourdomain.com/sitemap.xml</code> line to your
            robots.txt. Everything here runs in your browser — no URLs are uploaded.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Paste your page URLs above (one per line) and a valid XML sitemap appears
          instantly, ready to copy or download. Blank lines are ignored; anything that
          isn&apos;t a valid http/https URL is skipped and listed below.
        </p>
      )}
    </div>
  );
}
