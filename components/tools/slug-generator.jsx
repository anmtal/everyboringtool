"use client";

import { useState, useMemo, useCallback } from "react";
import { copyText } from "../../lib/copyText";

function slugify(text, { separator = "-", lowercase = true } = {}) {
  if (typeof text !== "string" || text.length === 0) return "";

  let result = text;

  // Normalize accents/diacritics (NFD) and strip combining marks.
  try {
    result = result.normalize("NFD").replace(/[̀-ͯ]/g, "");
  } catch (e) {
    // normalize should always exist in modern browsers; ignore if it throws.
  }

  if (lowercase) result = result.toLowerCase();

  // Turn every word-separating character into a space FIRST. Hyphens and slashes
  // must be included: otherwise the strip step below deletes them outright and
  // "state-of-the-art" collapses to "stateoftheart" instead of "state-of-the-art".
  result = result.replace(/[\s_\-‐-―/\\.,:;|]+/g, " ").trim();

  // Remove any character that is not a letter, number, or space.
  result = result.replace(/[^a-zA-Z0-9\s]+/g, "");

  // Collapse whitespace and convert to the chosen separator.
  const escaped = separator.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  result = result.replace(/\s+/g, separator);

  // Collapse repeated separators.
  if (escaped) {
    result = result.replace(new RegExp(`${escaped}{2,}`, "g"), separator);
  }

  // Trim leading/trailing separators.
  if (escaped) {
    result = result.replace(new RegExp(`^${escaped}+|${escaped}+$`, "g"), "");
  }

  return result;
}

export default function SlugGenerator() {
  const [text, setText] = useState("Hello World! This is My First Post.");
  const [separator, setSeparator] = useState("-");
  const [lowercase, setLowercase] = useState(true);
  const [copied, setCopied] = useState(false);

  const slug = useMemo(
    () => slugify(text, { separator, lowercase }),
    [text, separator, lowercase]
  );

  const wordCount = useMemo(() => {
    if (!slug) return 0;
    return slug.split(separator).filter(Boolean).length;
  }, [slug, separator]);

  const handleCopy = useCallback(async () => {
    if (!slug) return;
    try {
      await copyText(slug);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      // Clipboard may be unavailable (insecure context / permissions).
      setCopied(false);
    }
  }, [slug]);

  const handleClear = useCallback(() => {
    setText("");
    setCopied(false);
  }, []);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="slug-input">
              Text to convert
            </label>
            <textarea
              id="slug-input"
              className="tool-textarea"
              rows={3}
              value={text}
              placeholder="Type a title, heading, or phrase…"
              onChange={(e) => setText(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="slug-separator">
              Separator
            </label>
            <select
              id="slug-separator"
              className="tool-select"
              value={separator}
              onChange={(e) => setSeparator(e.target.value)}
            >
              <option value="-">Hyphen ( - )</option>
              <option value="_">Underscore ( _ )</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="slug-lowercase">
              Lowercase
            </label>
            <select
              id="slug-lowercase"
              className="tool-select"
              value={lowercase ? "yes" : "no"}
              onChange={(e) => setLowercase(e.target.value === "yes")}
            >
              <option value="yes">On (recommended)</option>
              <option value="no">Off (keep case)</option>
            </select>
          </div>
        </div>
      </div>

      <div className="tool-result" role="status" aria-live="polite">
        <div className="tool-result-label">URL slug</div>
        <div className="tool-result-value">{slug || "—"}</div>
      </div>

      {slug ? (
        <div className="tool-output">/{slug}</div>
      ) : (
        <p className="tool-note">
          Enter some text above to generate a clean, URL-safe slug.
        </p>
      )}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{slug.length}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{wordCount}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{separator === "-" ? "-" : "_"}</div>
          <div className="tool-stat-label">Separator</div>
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className={copied ? "btn btn-success" : "btn btn-primary"}
          onClick={handleCopy}
          disabled={!slug}
        >
          {copied ? "Copied!" : "Copy slug"}
        </button>
        <button type="button" className="btn" onClick={handleClear}>
          Clear
        </button>
      </div>

      <p className="tool-note">
        Slugs are lowercased, stripped of accents, and cleaned of symbols so
        they work safely in URLs, filenames, and IDs.
      </p>
    </div>
  );
}
