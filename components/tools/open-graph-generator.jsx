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

// Turn a raw URL string into a display hostname for the card preview.
function hostnameOf(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";
  let candidate = input;
  if (!/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(candidate)) {
    candidate = "https://" + candidate;
  }
  try {
    return new URL(candidate).hostname.replace(/^www\./, "");
  } catch (e) {
    return "";
  }
}

const OG_TYPES = [
  "website",
  "article",
  "product",
  "profile",
  "video.other",
  "music.song",
];

const TWITTER_CARDS = [
  { value: "summary_large_image", label: "summary_large_image (big image)" },
  { value: "summary", label: "summary (small square image)" },
];

export default function OpenGraphGenerator() {
  const [title, setTitle] = useState("How to Bake Sourdough Bread at Home");
  const [description, setDescription] = useState(
    "A step-by-step beginner guide to baking crusty sourdough, from starter to finished loaf."
  );
  const [url, setUrl] = useState("https://example.com/sourdough-guide");
  const [image, setImage] = useState("https://example.com/images/sourdough.jpg");
  const [imageAlt, setImageAlt] = useState("A golden sourdough loaf on a cooling rack");
  const [siteName, setSiteName] = useState("Example Kitchen");
  const [ogType, setOgType] = useState("article");
  const [twitterCard, setTwitterCard] = useState("summary_large_image");
  const [twitterSite, setTwitterSite] = useState("@examplekitchen");
  const [locale, setLocale] = useState("en_US");
  const [includeTwitter, setIncludeTwitter] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => {
    const lines = [];
    const t = title.trim();
    const d = description.trim();
    const u = url.trim();
    const img = image.trim();
    const alt = imageAlt.trim();
    const site = siteName.trim();
    const loc = locale.trim();
    const tSite = twitterSite.trim();

    if (t) lines.push(`<meta property="og:title" content="${escapeAttr(t)}" />`);
    if (ogType)
      lines.push(`<meta property="og:type" content="${escapeAttr(ogType)}" />`);
    if (u) lines.push(`<meta property="og:url" content="${escapeAttr(u)}" />`);
    if (d)
      lines.push(
        `<meta property="og:description" content="${escapeAttr(d)}" />`
      );
    if (site)
      lines.push(`<meta property="og:site_name" content="${escapeAttr(site)}" />`);
    if (loc)
      lines.push(`<meta property="og:locale" content="${escapeAttr(loc)}" />`);
    if (img) {
      lines.push(`<meta property="og:image" content="${escapeAttr(img)}" />`);
      if (alt)
        lines.push(
          `<meta property="og:image:alt" content="${escapeAttr(alt)}" />`
        );
    }

    if (includeTwitter) {
      if (lines.length) lines.push("");
      if (twitterCard)
        lines.push(
          `<meta name="twitter:card" content="${escapeAttr(twitterCard)}" />`
        );
      if (tSite)
        lines.push(`<meta name="twitter:site" content="${escapeAttr(tSite)}" />`);
      if (t)
        lines.push(`<meta name="twitter:title" content="${escapeAttr(t)}" />`);
      if (d)
        lines.push(
          `<meta name="twitter:description" content="${escapeAttr(d)}" />`
        );
      if (img)
        lines.push(`<meta name="twitter:image" content="${escapeAttr(img)}" />`);
      if (img && alt)
        lines.push(
          `<meta name="twitter:image:alt" content="${escapeAttr(alt)}" />`
        );
    }

    return lines.join("\n");
  }, [
    title,
    description,
    url,
    image,
    imageAlt,
    siteName,
    ogType,
    twitterCard,
    twitterSite,
    locale,
    includeTwitter,
  ]);

  const warnings = useMemo(() => {
    const w = [];
    const t = title.trim();
    const d = description.trim();
    const u = url.trim();
    const img = image.trim();
    if (t && t.length > 60)
      w.push(
        `Title is ${t.length} characters — most platforms truncate around 60. Consider shortening.`
      );
    if (d && d.length > 200)
      w.push(
        `Description is ${d.length} characters — aim for roughly 55–200 so it isn't cut off.`
      );
    if (u && !/^https?:\/\//i.test(u))
      w.push("og:url should be an absolute URL that starts with http:// or https://.");
    if (img && !/^https?:\/\//i.test(img))
      w.push(
        "og:image must be an absolute URL (starting with https://) — relative paths are ignored by scrapers."
      );
    if (img && !imageAlt.trim())
      w.push("Add image alt text so the preview image is described for accessibility.");
    return w;
  }, [title, description, url, image, imageAlt]);

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

  function handleReset() {
    setTitle("");
    setDescription("");
    setUrl("");
    setImage("");
    setImageAlt("");
    setSiteName("");
    setOgType("website");
    setTwitterCard("summary_large_image");
    setTwitterSite("");
    setLocale("en_US");
    setCopied(false);
  }

  const tagCount = output ? output.split("\n").filter((l) => l.trim()).length : 0;
  const previewHost = hostnameOf(url);
  const hasAnything =
    title.trim() ||
    description.trim() ||
    url.trim() ||
    image.trim() ||
    siteName.trim();

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="og-title">
            Title (og:title)
          </label>
          <input
            className="tool-input"
            id="og-title"
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="How to Bake Sourdough Bread at Home"
            autoComplete="off"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="og-desc">
            Description (og:description)
          </label>
          <textarea
            className="tool-textarea"
            id="og-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="A short, compelling summary of the page."
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="og-url">
              Page URL (og:url)
            </label>
            <input
              className="tool-input"
              id="og-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/page"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="og-site">
              Site name (og:site_name)
            </label>
            <input
              className="tool-input"
              id="og-site"
              type="text"
              value={siteName}
              onChange={(e) => setSiteName(e.target.value)}
              placeholder="Example Kitchen"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="og-image">
            Image URL (og:image) — use an absolute URL, ideally 1200×630px
          </label>
          <input
            className="tool-input"
            id="og-image"
            type="text"
            value={image}
            onChange={(e) => setImage(e.target.value)}
            placeholder="https://example.com/images/preview.jpg"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="og-alt">
            Image alt text (og:image:alt)
          </label>
          <input
            className="tool-input"
            id="og-alt"
            type="text"
            value={imageAlt}
            onChange={(e) => setImageAlt(e.target.value)}
            placeholder="Describe the preview image"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="og-type">
              Type (og:type)
            </label>
            <select
              className="tool-select"
              id="og-type"
              value={ogType}
              onChange={(e) => setOgType(e.target.value)}
            >
              {OG_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="og-locale">
              Locale (og:locale)
            </label>
            <input
              className="tool-input"
              id="og-locale"
              type="text"
              value={locale}
              onChange={(e) => setLocale(e.target.value)}
              placeholder="en_US"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="og-twitter">
            <input
              id="og-twitter"
              type="checkbox"
              checked={includeTwitter}
              onChange={(e) => setIncludeTwitter(e.target.checked)}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Also add Twitter / X Card tags
          </label>
        </div>

        {includeTwitter ? (
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="og-tw-card">
                Twitter card type
              </label>
              <select
                className="tool-select"
                id="og-tw-card"
                value={twitterCard}
                onChange={(e) => setTwitterCard(e.target.value)}
              >
                {TWITTER_CARDS.map((c) => (
                  <option key={c.value} value={c.value}>
                    {c.label}
                  </option>
                ))}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="og-tw-site">
                Twitter @handle (twitter:site)
              </label>
              <input
                className="tool-input"
                id="og-tw-site"
                type="text"
                value={twitterSite}
                onChange={(e) => setTwitterSite(e.target.value)}
                placeholder="@yoursite"
                autoComplete="off"
              />
            </div>
          </div>
        ) : null}
      </div>

      {hasAnything ? (
        <>
          <div className="tool-result-label">Social card preview</div>
          <div
            className="tool-result"
            role="status"
            aria-live="polite"
            style={{ padding: 0, overflow: "hidden" }}
          >
            {image.trim() ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={image.trim()}
                alt={imageAlt.trim() || "Preview image"}
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: 260,
                  objectFit: "cover",
                  aspectRatio: "1200 / 630",
                }}
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
            ) : null}
            <div style={{ padding: "12px 14px" }}>
              {previewHost ? (
                <div
                  className="tool-result-label"
                  style={{ textTransform: "uppercase" }}
                >
                  {previewHost}
                </div>
              ) : null}
              <div
                className="tool-result-value"
                style={{ fontWeight: 600, marginTop: 2 }}
              >
                {title.trim() || "Your title will appear here"}
              </div>
              {description.trim() ? (
                <div className="tool-note" style={{ marginTop: 4 }}>
                  {description.trim()}
                </div>
              ) : null}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{tagCount}</div>
              <div className="tool-stat-label">
                meta tag{tagCount === 1 ? "" : "s"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{title.trim().length}</div>
              <div className="tool-stat-label">title chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{description.trim().length}</div>
              <div className="tool-stat-label">desc chars</div>
            </div>
          </div>

          {warnings.length ? (
            <div className="tool-note">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
                disabled={!output}
              >
                {copied ? "Copied!" : "Copy meta tags"}
              </button>
              <button className="btn" type="button" onClick={handleReset}>
                Reset
              </button>
            </div>
            <label className="tool-label" htmlFor="og-output">
              Meta tags — paste inside &lt;head&gt;
            </label>
            <pre className="tool-output" id="og-output">
              {output}
            </pre>
          </div>

          <p className="tool-note">
            Paste these tags into the &lt;head&gt; of your page. After deploying,
            re-scrape the URL with each platform&apos;s debugger (Facebook Sharing
            Debugger, LinkedIn Post Inspector) so caches update. og:image should be
            a publicly reachable absolute URL — around 1200×630px works best.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Fill in a title, description, URL and image above to generate your Open
          Graph and Twitter Card meta tags, with a live preview of how the link
          will look when shared. Everything runs in your browser — nothing is
          uploaded.
        </p>
      )}
    </div>
  );
}
