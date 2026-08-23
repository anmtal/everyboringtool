"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function escapeAttr(value) {
  return escapeHtml(value).replace(/"/g, "&quot;");
}

export default function MetaTagGenerator() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [url, setUrl] = useState("");
  const [image, setImage] = useState("");
  const [keywords, setKeywords] = useState("");
  const [ogType, setOgType] = useState("website");
  const [copied, setCopied] = useState(false);

  const tags = useMemo(() => {
    const t = title.trim();
    const d = description.trim();
    const u = url.trim();
    const img = image.trim();
    const kw = keywords.trim();

    const lines = [];

    // Standard tags
    if (t) lines.push(`<title>${escapeHtml(t)}</title>`);
    if (d) lines.push(`<meta name="description" content="${escapeAttr(d)}" />`);
    if (kw) lines.push(`<meta name="keywords" content="${escapeAttr(kw)}" />`);
    if (u) lines.push(`<link rel="canonical" href="${escapeAttr(u)}" />`);

    // Open Graph
    if (t) lines.push(`<meta property="og:title" content="${escapeAttr(t)}" />`);
    if (d)
      lines.push(
        `<meta property="og:description" content="${escapeAttr(d)}" />`
      );
    if (u) lines.push(`<meta property="og:url" content="${escapeAttr(u)}" />`);
    if (img)
      lines.push(`<meta property="og:image" content="${escapeAttr(img)}" />`);
    if (t || d || u || img)
      lines.push(`<meta property="og:type" content="${escapeAttr(ogType)}" />`);

    // Twitter Card
    if (t || d || img) {
      const card = img ? "summary_large_image" : "summary";
      lines.push(`<meta name="twitter:card" content="${card}" />`);
    }
    if (t)
      lines.push(`<meta name="twitter:title" content="${escapeAttr(t)}" />`);
    if (d)
      lines.push(
        `<meta name="twitter:description" content="${escapeAttr(d)}" />`
      );
    if (img)
      lines.push(`<meta name="twitter:image" content="${escapeAttr(img)}" />`);

    return lines.join("\n");
  }, [title, description, url, image, keywords, ogType]);

  const tagCount = tags ? tags.split("\n").length : 0;
  const titleLen = title.trim().length;
  const descLen = description.trim().length;

  async function handleCopy() {
    if (!tags) return;
    try {
      await copyText(tags);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleClear() {
    setTitle("");
    setDescription("");
    setUrl("");
    setImage("");
    setKeywords("");
    setOgType("website");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="mtg-title">
            Page title
          </label>
          <input
            className="tool-input"
            id="mtg-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Every Boring Tool — Free Online Tools"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="mtg-desc">
            Description
          </label>
          <textarea
            className="tool-textarea"
            id="mtg-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A collection of free, fast, privacy-friendly tools that run entirely in your browser."
            rows={3}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mtg-url">
              Canonical URL
            </label>
            <input
              className="tool-input"
              id="mtg-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="mtg-image">
              Image URL
            </label>
            <input
              className="tool-input"
              id="mtg-image"
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/preview.png"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="mtg-keywords">
              Keywords
            </label>
            <input
              className="tool-input"
              id="mtg-keywords"
              type="text"
              value={keywords}
              onChange={(e) => setKeywords(e.target.value)}
              placeholder="free tools, online tools, meta tags"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="mtg-type">
              Open Graph type
            </label>
            <select
              className="tool-select"
              id="mtg-type"
              value={ogType}
              onChange={(e) => setOgType(e.target.value)}
            >
              <option value="website">website</option>
              <option value="article">article</option>
              <option value="product">product</option>
              <option value="profile">profile</option>
              <option value="video.other">video.other</option>
            </select>
          </div>
        </div>
      </div>

      {title.trim() || description.trim() ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{titleLen}</div>
            <div className="tool-stat-label">
              title chars{titleLen > 60 ? " (over 60)" : ""}
            </div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{descLen}</div>
            <div className="tool-stat-label">
              description chars{descLen > 160 ? " (over 160)" : ""}
            </div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{tagCount}</div>
            <div className="tool-stat-label">tags generated</div>
          </div>
        </div>
      ) : null}

      {tags ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy all tags"}
            </button>
            <button className="btn" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
          <label className="tool-label" htmlFor="mtg-output">
            Generated meta tags
          </label>
          <pre className="tool-output" id="mtg-output">
            {tags}
          </pre>
          <p className="tool-note">
            Paste these inside the &lt;head&gt; of your HTML page. Aim for a
            title under ~60 characters and a description under ~160 for the best
            search and social previews.
          </p>
        </div>
      ) : (
        <p className="tool-note">
          Fill in at least a page title or description above and your meta tags
          will appear here instantly, ready to copy into your page&apos;s head.
        </p>
      )}
    </div>
  );
}
