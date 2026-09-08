"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Article types Google supports for the Article structured-data feature.
const ARTICLE_TYPES = [
  { value: "Article", label: "Article (generic)" },
  { value: "NewsArticle", label: "NewsArticle" },
  { value: "BlogPosting", label: "BlogPosting" },
];

// Turn a datetime-local value (or a plain date) into an ISO 8601 string with
// the local timezone offset, which is what Google expects for dates.
function toIso(value) {
  const raw = String(value || "").trim();
  if (!raw) return "";
  // Already looks like a full ISO string with offset/zone — keep as-is.
  if (/[zZ]|[+-]\d{2}:?\d{2}$/.test(raw) && raw.indexOf("T") !== -1) return raw;

  const d = new Date(raw);
  if (isNaN(d.getTime())) return raw; // let it through; user may know better

  const pad = (n) => String(n).padStart(2, "0");
  const offMin = -d.getTimezoneOffset();
  const sign = offMin >= 0 ? "+" : "-";
  const abs = Math.abs(offMin);
  const offset = sign + pad(Math.floor(abs / 60)) + ":" + pad(abs % 60);

  // If the user only gave a date (no time), don't fabricate a time component.
  if (/^\d{4}-\d{2}-\d{2}$/.test(raw)) {
    return raw;
  }
  return (
    d.getFullYear() +
    "-" +
    pad(d.getMonth() + 1) +
    "-" +
    pad(d.getDate()) +
    "T" +
    pad(d.getHours()) +
    ":" +
    pad(d.getMinutes()) +
    ":" +
    pad(d.getSeconds()) +
    offset
  );
}

function isHttpUrl(v) {
  const s = String(v || "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch {
    return false;
  }
}

// Split a comma / newline separated list into trimmed, de-duped entries.
function splitList(v) {
  return String(v || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .filter((s, i, arr) => arr.indexOf(s) === i);
}

export default function SchemaArticleGenerator() {
  const [type, setType] = useState("BlogPosting");
  const [headline, setHeadline] = useState("How to Bake Sourdough Bread at Home");
  const [url, setUrl] = useState("https://example.com/blog/sourdough-bread");
  const [description, setDescription] = useState(
    "A step-by-step guide to baking your first loaf of sourdough bread, from starter to crust."
  );
  const [images, setImages] = useState(
    "https://example.com/images/sourdough-16x9.jpg\nhttps://example.com/images/sourdough-4x3.jpg"
  );
  const [authorType, setAuthorType] = useState("Person");
  const [authorName, setAuthorName] = useState("Jane Baker");
  const [authorUrl, setAuthorUrl] = useState("");
  const [publisher, setPublisher] = useState("Example Kitchen");
  const [publisherLogo, setPublisherLogo] = useState(
    "https://example.com/logo.png"
  );
  const [datePublished, setDatePublished] = useState("2026-09-01T09:00");
  const [dateModified, setDateModified] = useState("");
  const [copied, setCopied] = useState(false);

  const build = useMemo(() => {
    const warnings = [];
    const schema = { "@context": "https://schema.org", "@type": type };

    const h = headline.trim();
    if (h) {
      schema.headline = h;
      if (h.length > 110) {
        warnings.push(
          "Google truncates the headline at ~110 characters — yours is " +
            h.length +
            "."
        );
      }
    } else {
      warnings.push("Headline is required for Article structured data.");
    }

    const imgList = splitList(images);
    const badImg = imgList.filter((u) => !isHttpUrl(u));
    if (imgList.length) {
      schema.image = imgList.length === 1 ? imgList[0] : imgList;
      if (badImg.length) {
        warnings.push(
          badImg.length +
            " image value" +
            (badImg.length === 1 ? " is" : "s are") +
            " not a valid http(s) URL."
        );
      }
    } else {
      warnings.push(
        "Add at least one image URL — Google recommends multiple aspect ratios (16x9, 4x3, 1x1)."
      );
    }

    const aName = authorName.trim();
    if (aName) {
      const author = { "@type": authorType, name: aName };
      if (authorUrl.trim()) {
        author.url = authorUrl.trim();
        if (!isHttpUrl(authorUrl)) warnings.push("Author URL is not a valid URL.");
      }
      schema.author = author;
    } else {
      warnings.push("Author name is recommended.");
    }

    const dp = toIso(datePublished);
    if (dp) {
      schema.datePublished = dp;
    } else {
      warnings.push("datePublished is recommended.");
    }
    const dm = toIso(dateModified);
    if (dm) schema.dateModified = dm;
    if (dp && dm && new Date(dm) < new Date(dp)) {
      warnings.push("dateModified is earlier than datePublished — check the dates.");
    }

    const pub = publisher.trim();
    if (pub) {
      const p = { "@type": "Organization", name: pub };
      const logo = publisherLogo.trim();
      if (logo) {
        p.logo = { "@type": "ImageObject", url: logo };
        if (!isHttpUrl(logo)) warnings.push("Publisher logo is not a valid URL.");
      }
      schema.publisher = p;
    }
    // NewsArticle strongly benefits from a publisher; note if missing.
    if (!pub && type === "NewsArticle") {
      warnings.push("NewsArticle should include a publisher Organization.");
    }

    const desc = description.trim();
    if (desc) schema.description = desc;

    const pageUrl = url.trim();
    if (pageUrl) {
      schema.mainEntityOfPage = {
        "@type": "WebPage",
        "@id": pageUrl,
      };
      schema.url = pageUrl;
      if (!isHttpUrl(pageUrl)) warnings.push("Page URL is not a valid URL.");
    }

    const json = JSON.stringify(schema, null, 2);
    const output =
      '<script type="application/ld+json">\n' + json + "\n</script>";

    return { schema, json, output, warnings };
  }, [
    type,
    headline,
    url,
    description,
    images,
    authorType,
    authorName,
    authorUrl,
    publisher,
    publisherLogo,
    datePublished,
    dateModified,
  ]);

  async function handleCopy() {
    if (!build.output) return;
    try {
      await copyText(build.output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([build.output], { type: "text/html" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = "article-schema.html";
    a.click();
    URL.revokeObjectURL(dlUrl);
  }

  const hasRequired = headline.trim().length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-type">
              Article type
            </label>
            <select
              className="tool-select"
              id="sag-type"
              value={type}
              onChange={(e) => setType(e.target.value)}
            >
              {ARTICLE_TYPES.map((t) => (
                <option key={t.value} value={t.value}>
                  {t.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-url">
              Page URL
            </label>
            <input
              className="tool-input"
              id="sag-url"
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com/blog/post"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sag-headline">
            Headline
          </label>
          <input
            className="tool-input"
            id="sag-headline"
            type="text"
            value={headline}
            onChange={(e) => setHeadline(e.target.value)}
            placeholder="Your article title"
            autoComplete="off"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sag-desc">
            Description
          </label>
          <textarea
            className="tool-textarea"
            id="sag-desc"
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="A short summary of the article"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sag-images">
            Image URLs (one per line or comma-separated)
          </label>
          <textarea
            className="tool-textarea"
            id="sag-images"
            rows={2}
            value={images}
            onChange={(e) => setImages(e.target.value)}
            placeholder="https://example.com/image-16x9.jpg"
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-author-type">
              Author type
            </label>
            <select
              className="tool-select"
              id="sag-author-type"
              value={authorType}
              onChange={(e) => setAuthorType(e.target.value)}
            >
              <option value="Person">Person</option>
              <option value="Organization">Organization</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-author">
              Author name
            </label>
            <input
              className="tool-input"
              id="sag-author"
              type="text"
              value={authorName}
              onChange={(e) => setAuthorName(e.target.value)}
              placeholder="Jane Baker"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-author-url">
              Author URL (optional)
            </label>
            <input
              className="tool-input"
              id="sag-author-url"
              type="text"
              value={authorUrl}
              onChange={(e) => setAuthorUrl(e.target.value)}
              placeholder="https://example.com/author/jane"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-publisher">
              Publisher name
            </label>
            <input
              className="tool-input"
              id="sag-publisher"
              type="text"
              value={publisher}
              onChange={(e) => setPublisher(e.target.value)}
              placeholder="Example Kitchen"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-logo">
              Publisher logo URL
            </label>
            <input
              className="tool-input"
              id="sag-logo"
              type="text"
              value={publisherLogo}
              onChange={(e) => setPublisherLogo(e.target.value)}
              placeholder="https://example.com/logo.png"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-published">
              Date published
            </label>
            <input
              className="tool-input"
              id="sag-published"
              type="datetime-local"
              value={datePublished}
              onChange={(e) => setDatePublished(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sag-modified">
              Date modified (optional)
            </label>
            <input
              className="tool-input"
              id="sag-modified"
              type="datetime-local"
              value={dateModified}
              onChange={(e) => setDateModified(e.target.value)}
            />
          </div>
        </div>
      </div>

      {hasRequired ? (
        <>
          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy JSON-LD"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .html
              </button>
            </div>
            <label className="tool-label" htmlFor="sag-output">
              Article schema (JSON-LD)
            </label>
            <pre className="tool-output" id="sag-output" role="status" aria-live="polite">
              {build.output}
            </pre>
          </div>

          {build.warnings.length ? (
            <div className="tool-note">
              {build.warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <p className="tool-note">
            Paste this whole &lt;script&gt; block into the &lt;head&gt; (or
            anywhere in the &lt;body&gt;) of the article page. Every field must
            match what a reader actually sees on the page. Validate the result
            with Google&apos;s Rich Results Test before publishing.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a headline to generate your Article JSON-LD. Everything is built
          in your browser — nothing is uploaded or saved.
        </p>
      )}
    </div>
  );
}
