"use client";

import { useState, useMemo } from "react";

// Small helper: append or replace a query param on a URL without touching
// existing params or the hash fragment. Values are encoded by URLSearchParams.
function buildTaggedUrl(base, params) {
  const url = new URL(base);
  for (const [key, value] of params) {
    // Only append params that actually have a non-empty (trimmed) value.
    const v = value.trim();
    if (v) url.searchParams.set(key, v);
  }
  return url.toString();
}

export default function UtmBuilder() {
  const [baseUrl, setBaseUrl] = useState("");
  const [source, setSource] = useState("");
  const [medium, setMedium] = useState("");
  const [campaign, setCampaign] = useState("");
  const [term, setTerm] = useState("");
  const [content, setContent] = useState("");
  const [copied, setCopied] = useState(false);

  const params = useMemo(
    () => [
      ["utm_source", source],
      ["utm_medium", medium],
      ["utm_campaign", campaign],
      ["utm_term", term],
      ["utm_content", content],
    ],
    [source, medium, campaign, term, content]
  );

  const { output, error, appended } = useMemo(() => {
    const trimmedBase = baseUrl.trim();
    if (!trimmedBase) {
      return { output: "", error: "", appended: 0 };
    }

    // Validate the base URL. Require an http/https scheme so the result is a
    // usable link and not something like "mailto:" or a bare word.
    let parsed;
    try {
      parsed = new URL(trimmedBase);
    } catch {
      return {
        output: "",
        error:
          "That doesn't look like a valid URL. Include the scheme, e.g. https://example.com/page.",
        appended: 0,
      };
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      return {
        output: "",
        error: "Please use a full http:// or https:// URL.",
        appended: 0,
      };
    }

    try {
      const result = buildTaggedUrl(trimmedBase, params);
      const appendedCount = params.filter(([, v]) => v.trim()).length;
      return { output: result, error: "", appended: appendedCount };
    } catch {
      return {
        output: "",
        error: "Could not build the tagged URL from that input.",
        appended: 0,
      };
    }
  }, [baseUrl, params]);

  function handleCopy() {
    if (!output) return;
    try {
      navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleClear() {
    setBaseUrl("");
    setSource("");
    setMedium("");
    setCampaign("");
    setTerm("");
    setContent("");
    setCopied(false);
  }

  const hasAnyInput =
    baseUrl || source || medium || campaign || term || content;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="utm-base">
            Base URL
          </label>
          <input
            id="utm-base"
            type="url"
            className="tool-input"
            value={baseUrl}
            onChange={(e) => setBaseUrl(e.target.value)}
            placeholder="https://example.com/landing-page"
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-source">
              Campaign Source (utm_source)
            </label>
            <input
              id="utm-source"
              type="text"
              className="tool-input"
              value={source}
              onChange={(e) => setSource(e.target.value)}
              placeholder="google"
              spellCheck="false"
              autoComplete="off"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-medium">
              Campaign Medium (utm_medium)
            </label>
            <input
              id="utm-medium"
              type="text"
              className="tool-input"
              value={medium}
              onChange={(e) => setMedium(e.target.value)}
              placeholder="cpc"
              spellCheck="false"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="utm-campaign">
            Campaign Name (utm_campaign)
          </label>
          <input
            id="utm-campaign"
            type="text"
            className="tool-input"
            value={campaign}
            onChange={(e) => setCampaign(e.target.value)}
            placeholder="spring_sale"
            spellCheck="false"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-term">
              Campaign Term (utm_term) — optional
            </label>
            <input
              id="utm-term"
              type="text"
              className="tool-input"
              value={term}
              onChange={(e) => setTerm(e.target.value)}
              placeholder="running+shoes"
              spellCheck="false"
              autoComplete="off"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="utm-content">
              Campaign Content (utm_content) — optional
            </label>
            <input
              id="utm-content"
              type="text"
              className="tool-input"
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder="logolink"
              spellCheck="false"
              autoComplete="off"
            />
          </div>
        </div>

        <p className="tool-note">
          Source, medium and campaign are the standard trio most analytics
          tools expect. Term and content are optional. Only filled fields are
          added to the link, and every value is URL-encoded automatically.
        </p>

        <div className="tool-actions">
          <button
            type="button"
            className="btn"
            onClick={handleClear}
            disabled={!hasAnyInput}
          >
            Clear
          </button>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {output && !error ? (
        <>
          <div className="tool-result">
            <span className="tool-result-label">Tagged URL</span>
            <span
              className="tool-result-value"
              style={{ wordBreak: "break-all" }}
            >
              {output}
            </span>
          </div>

          <pre className="tool-output">{output}</pre>

          <div className="tool-actions">
            <button
              type="button"
              className={copied ? "btn btn-success" : "btn btn-primary"}
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy tagged URL"}
            </button>
          </div>

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <span className="tool-stat-num">{appended}</span>
              <span className="tool-stat-label">UTM params added</span>
            </div>
            <div className="tool-stat">
              <span className="tool-stat-num">{output.length}</span>
              <span className="tool-stat-label">URL length</span>
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
