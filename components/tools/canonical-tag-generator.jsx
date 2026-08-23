"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

function escapeAttr(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Validate + normalize a page URL. Returns { url, error, warnings }.
function normalizeUrl(raw, opts) {
  const input = String(raw || "").trim();
  if (!input) {
    return { url: "", error: "", warnings: [] };
  }

  // Add a scheme if the user pasted a bare domain like "example.com/page".
  let candidate = input;
  let addedScheme = false;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(candidate)) {
      // Has a scheme like "mailto:" or "tel:" but not "://" — reject below.
      candidate = input;
    } else {
      candidate = "https://" + candidate;
      addedScheme = true;
    }
  }

  let parsed;
  try {
    parsed = new URL(candidate);
  } catch (e) {
    return {
      url: "",
      error: "That doesn't look like a valid URL. Try something like https://example.com/page.",
      warnings: [],
    };
  }

  const protocol = parsed.protocol.toLowerCase();
  if (protocol !== "http:" && protocol !== "https:") {
    return {
      url: "",
      error: "Only http and https URLs can have a canonical tag.",
      warnings: [],
    };
  }

  if (!parsed.hostname || parsed.hostname.indexOf(".") === -1) {
    return {
      url: "",
      error: "Enter a full domain, for example https://example.com/page.",
      warnings: [],
    };
  }

  const warnings = [];

  // Protocol + host are always normalized to lowercase (case-insensitive by spec).
  const scheme = opts.forceHttps ? "https:" : protocol;
  if (opts.forceHttps && protocol === "http:") {
    warnings.push("Upgraded http:// to https:// for the canonical URL.");
  }
  const host = parsed.hostname.toLowerCase();

  // Drop default ports.
  let port = parsed.port;
  if (
    (scheme === "https:" && port === "443") ||
    (scheme === "http:" && port === "80")
  ) {
    port = "";
  }
  const authority = host + (port ? ":" + port : "");

  // Path — optionally drop a trailing slash (but never the root "/").
  let path = parsed.pathname || "/";
  if (opts.stripTrailingSlash && path.length > 1 && path.endsWith("/")) {
    path = path.replace(/\/+$/, "");
    if (path === "") path = "/";
  }

  const query = opts.stripQuery ? "" : parsed.search || "";
  const hash = opts.stripHash ? "" : parsed.hash || "";

  if (!opts.stripQuery && parsed.search) {
    warnings.push(
      "The URL keeps a query string (?...). Canonicals usually point to the clean version without tracking parameters."
    );
  }
  if (!opts.stripHash && parsed.hash) {
    warnings.push(
      "The URL keeps a fragment (#...). Fragments are ignored by search engines in canonical tags."
    );
  }
  if (addedScheme) {
    warnings.push("Added https:// since no protocol was given.");
  }

  const url = scheme + "//" + authority + path + query + hash;
  return { url, error: "", warnings };
}

export default function CanonicalTagGenerator() {
  const [input, setInput] = useState("");
  const [includeOg, setIncludeOg] = useState(true);
  const [forceHttps, setForceHttps] = useState(true);
  const [stripTrailingSlash, setStripTrailingSlash] = useState(false);
  const [stripQuery, setStripQuery] = useState(false);
  const [stripHash, setStripHash] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(
    () =>
      normalizeUrl(input, {
        forceHttps,
        stripTrailingSlash,
        stripQuery,
        stripHash,
      }),
    [input, forceHttps, stripTrailingSlash, stripQuery, stripHash]
  );

  const output = useMemo(() => {
    if (!result.url) return "";
    const href = escapeAttr(result.url);
    const lines = [`<link rel="canonical" href="${href}" />`];
    if (includeOg) {
      lines.push(`<meta property="og:url" content="${href}" />`);
    }
    return lines.join("\n");
  }, [result.url, includeOg]);

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

  function handleClear() {
    setInput("");
    setCopied(false);
  }

  const tagCount = output ? output.split("\n").length : 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ctg-url">
            Page URL
          </label>
          <input
            className="tool-input"
            id="ctg-url"
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="https://example.com/blog/my-post"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ctg-og">
              <input
                id="ctg-og"
                type="checkbox"
                checked={includeOg}
                onChange={(e) => setIncludeOg(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Also add matching og:url tag
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ctg-https">
              <input
                id="ctg-https"
                type="checkbox"
                checked={forceHttps}
                onChange={(e) => setForceHttps(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Force https://
            </label>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ctg-query">
              <input
                id="ctg-query"
                type="checkbox"
                checked={stripQuery}
                onChange={(e) => setStripQuery(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Remove query string (?...)
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ctg-hash">
              <input
                id="ctg-hash"
                type="checkbox"
                checked={stripHash}
                onChange={(e) => setStripHash(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Remove fragment (#...)
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ctg-slash">
              <input
                id="ctg-slash"
                type="checkbox"
                checked={stripTrailingSlash}
                onChange={(e) => setStripTrailingSlash(e.target.checked)}
                style={{ marginRight: 8, verticalAlign: "middle" }}
              />
              Remove trailing slash
            </label>
          </div>
        </div>
      </div>

      {result.error ? (
        <div className="tool-error">{result.error}</div>
      ) : null}

      {output ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Normalized URL</div>
            <div className="tool-result-value">{result.url}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{tagCount}</div>
              <div className="tool-stat-label">
                tag{tagCount === 1 ? "" : "s"} generated
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.url.length}</div>
              <div className="tool-stat-label">URL length</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy tag"}
              </button>
              <button className="btn" type="button" onClick={handleClear}>
                Clear
              </button>
            </div>
            <label className="tool-label" htmlFor="ctg-output">
              Canonical tag
            </label>
            <pre className="tool-output" id="ctg-output">
              {output}
            </pre>
          </div>

          {result.warnings.length ? (
            <div className="tool-note">
              {result.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <p className="tool-note">
            Place this inside the &lt;head&gt; of the page it points to. Every URL
            variant of the same content should carry an identical canonical tag
            pointing at the one preferred version.
          </p>
        </>
      ) : !result.error ? (
        <p className="tool-note">
          Paste any page URL above and your &lt;link rel=&quot;canonical&quot;&gt;
          tag appears instantly, ready to drop into your page&apos;s head. Nothing
          is sent anywhere — it all runs in your browser.
        </p>
      ) : null}
    </div>
  );
}
