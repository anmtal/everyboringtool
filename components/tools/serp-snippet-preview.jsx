"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Recommended limits Google roughly uses for desktop results.
const TITLE_CHAR_LIMIT = 60;
const TITLE_PX_LIMIT = 600;
const DESC_CHAR_LIMIT = 160;

const SAMPLE = {
  title: "Free Online SERP Snippet Preview Tool — Every Boring Tool",
  url: "https://everyboringtool.com/tools/serp-snippet-preview",
  description:
    "Preview exactly how your page title, URL and meta description appear in Google search results. See character counts and pixel widths before you publish.",
};

// Deterministic character-based truncation (safe on the server, no canvas).
function truncateChars(text, max) {
  if (text.length <= max) return text;
  let cut = text.slice(0, max);
  const lastSpace = cut.lastIndexOf(" ");
  if (lastSpace > max - 25) cut = cut.slice(0, lastSpace);
  return cut.replace(/[\s,.;:!\-–—]+$/, "") + "…";
}

// Build the green-grey breadcrumb from a raw URL string, gracefully.
function buildBreadcrumb(rawUrl) {
  const raw = (rawUrl || "").trim();
  if (!raw) {
    return { domain: "www.example.com", crumb: "https://www.example.com" };
  }
  let candidate = raw;
  if (!/^https?:\/\//i.test(candidate)) candidate = "https://" + candidate;
  try {
    const parsed = new URL(candidate);
    const host = parsed.hostname;
    const segments = parsed.pathname
      .split("/")
      .filter(Boolean)
      .map((seg) => {
        try {
          return decodeURIComponent(seg);
        } catch {
          return seg;
        }
      });
    const shownHost = host.replace(/^www\./i, "");
    const crumb = [shownHost, ...segments].join(" › ");
    return { domain: shownHost, crumb };
  } catch {
    // Not a parseable URL — show whatever the user typed.
    return { domain: raw, crumb: raw };
  }
}

export default function SerpSnippetPreview() {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [description, setDescription] = useState("");
  const [mounted, setMounted] = useState(false);
  const canvasRef = useRef(null);

  // Only measure pixel widths after mount so SSR and first client render match.
  useEffect(() => {
    setMounted(true);
  }, []);

  function measure(text, font) {
    if (!mounted || typeof document === "undefined") return null;
    if (!canvasRef.current) canvasRef.current = document.createElement("canvas");
    const ctx = canvasRef.current.getContext("2d");
    if (!ctx) return null;
    ctx.font = font;
    return ctx.measureText(text).width;
  }

  // Pixel-accurate title truncation (Google uses ~20px Arial, ~600px cap).
  function truncateTitleByWidth(text) {
    const font = "20px Arial, sans-serif";
    if (!mounted) return truncateChars(text, TITLE_CHAR_LIMIT);
    const width = measure(text, font);
    if (width === null) return truncateChars(text, TITLE_CHAR_LIMIT);
    if (width <= TITLE_PX_LIMIT) return text;
    const ell = "…";
    let lo = 0;
    let hi = text.length;
    while (lo < hi) {
      const mid = Math.ceil((lo + hi) / 2);
      const w = measure(text.slice(0, mid) + ell, font);
      if (w !== null && w <= TITLE_PX_LIMIT) lo = mid;
      else hi = mid - 1;
    }
    return text.slice(0, lo).replace(/\s+$/, "") + ell;
  }

  const t = title.trim();
  const d = description.trim();

  const displayTitle = useMemo(
    () => truncateTitleByWidth(t || "Your page title will appear here"),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [t, mounted]
  );

  const displayDesc = useMemo(() => {
    const text =
      d ||
      "Your meta description will appear here. Write a compelling summary of the page to encourage clicks from the search results.";
    return truncateChars(text, DESC_CHAR_LIMIT);
  }, [d]);

  const breadcrumb = useMemo(() => buildBreadcrumb(url), [url]);

  const titleLen = t.length;
  const descLen = d.length;
  const titlePx = useMemo(() => {
    const w = measure(t || "", "20px Arial, sans-serif");
    return w === null ? null : Math.round(w);
  }, [t, mounted]); // eslint-disable-line react-hooks/exhaustive-deps

  const titleOver = titleLen > TITLE_CHAR_LIMIT;
  const titlePxOver = titlePx !== null && titlePx > TITLE_PX_LIMIT;
  const descOver = descLen > DESC_CHAR_LIMIT;

  const RED = "#dc2626";
  const domainLetter = (breadcrumb.domain || "e").charAt(0).toUpperCase();

  function handleClear() {
    setTitle("");
    setUrl("");
    setDescription("");
  }

  function handleSample() {
    setTitle(SAMPLE.title);
    setUrl(SAMPLE.url);
    setDescription(SAMPLE.description);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="serp-title">
            Page title
          </label>
          <input
            className="tool-input"
            id="serp-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Free Online SERP Snippet Preview — Every Boring Tool"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="serp-url">
            Page URL
          </label>
          <input
            className="tool-input"
            id="serp-url"
            type="text"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/blog/my-post"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="serp-desc">
            Meta description
          </label>
          <textarea
            className="tool-textarea"
            id="serp-desc"
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Write a compelling summary of the page to encourage clicks from Google search results."
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {/* Google-style desktop result preview: self-contained white card. */}
      <div className="tool-field">
        <label className="tool-label">Desktop preview</label>
        <div
          style={{
            background: "#ffffff",
            border: "1px solid #dfe1e5",
            borderRadius: 10,
            padding: "16px 18px",
            maxWidth: 620,
            fontFamily: "Arial, Roboto, Helvetica, sans-serif",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            overflow: "hidden",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              marginBottom: 6,
            }}
          >
            <span
              aria-hidden="true"
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 26,
                height: 26,
                borderRadius: "50%",
                background: "#f1f3f4",
                border: "1px solid #ebebeb",
                color: "#5f6368",
                fontSize: 13,
                fontWeight: 700,
                flexShrink: 0,
              }}
            >
              {domainLetter}
            </span>
            <span style={{ lineHeight: 1.2, minWidth: 0 }}>
              <span
                style={{
                  display: "block",
                  color: "#202124",
                  fontSize: 14,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {breadcrumb.domain}
              </span>
              <span
                style={{
                  display: "block",
                  color: "#5b7568",
                  fontSize: 12,
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                }}
              >
                {breadcrumb.crumb}
              </span>
            </span>
          </div>

          <div
            style={{
              color: "#1a0dab",
              fontSize: 20,
              lineHeight: 1.3,
              fontWeight: 400,
              cursor: "pointer",
            }}
          >
            {displayTitle}
          </div>

          <div
            style={{
              color: "#4d5156",
              fontSize: 14,
              lineHeight: 1.58,
              marginTop: 3,
              wordBreak: "break-word",
            }}
          >
            {displayDesc}
          </div>
        </div>
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={titleOver ? { color: RED } : undefined}
          >
            {titleLen}
          </div>
          <div
            className="tool-stat-label"
            style={titleOver ? { color: RED } : undefined}
          >
            Title chars (max ~{TITLE_CHAR_LIMIT})
          </div>
        </div>

        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={titlePxOver ? { color: RED } : undefined}
          >
            {titlePx === null ? "—" : `${titlePx}px`}
          </div>
          <div
            className="tool-stat-label"
            style={titlePxOver ? { color: RED } : undefined}
          >
            Title width (max ~{TITLE_PX_LIMIT}px)
          </div>
        </div>

        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={descOver ? { color: RED } : undefined}
          >
            {descLen}
          </div>
          <div
            className="tool-stat-label"
            style={descOver ? { color: RED } : undefined}
          >
            Description chars (max ~{DESC_CHAR_LIMIT})
          </div>
        </div>
      </div>

      {titleOver || titlePxOver || descOver ? (
        <p className="tool-error">
          {titleOver || titlePxOver
            ? "Your title may be cut off in search results. "
            : ""}
          {descOver
            ? "Your description is longer than Google usually shows and will be truncated."
            : ""}
        </p>
      ) : null}

      <p className="tool-note">
        Everything runs entirely in your browser — nothing you type is uploaded
        or stored. Google may rewrite titles and descriptions, so treat this as a
        close guide rather than an exact guarantee.
      </p>
    </div>
  );
}
