"use client";

import { useMemo, useState } from "react";

// Curated list of broadly popular engagement hashtags. These are appended to
// every result so users always leave with a usable, discovery-friendly set.
const GENERIC_HASHTAGS = [
  "instagood",
  "photooftheday",
  "trending",
  "viral",
  "love",
  "instadaily",
  "explore",
  "explorepage",
  "reels",
  "fyp",
  "follow",
  "likeforlikes",
  "picoftheday",
  "beautiful",
  "happy",
  "instamood",
  "style",
  "art",
  "motivation",
  "inspiration",
  "smallbusiness",
  "contentcreator",
  "trendingnow",
  "bhfyp",
];

// Instagram allows at most 30 hashtags per post, so we cap the output there
// and always keep the user's own keyword-derived tags before filling the rest
// with generic engagement tags.
const MAX_HASHTAGS = 30;

// Reduce a raw token to the alphanumeric core used inside a hashtag.
// "Photo-Graphy!" -> "photography". Numbers are kept; a leading digit is fine.
function cleanWord(word) {
  return word.replace(/[^a-zA-Z0-9]/g, "");
}

function capitalize(word) {
  if (!word) return "";
  return word.charAt(0).toUpperCase() + word.slice(1).toLowerCase();
}

// Build an ordered, de-duplicated hashtag list from a raw input string.
// Everything here is pure and deterministic — same input always yields the
// same output, with no network calls.
function generateHashtags(raw) {
  const tokens = (raw || "")
    .split(/[\s,]+/)
    .map((t) => t.trim())
    .filter(Boolean);

  // Clean each token, dropping any that reduce to nothing (e.g. "!!!").
  const words = [];
  for (const token of tokens) {
    const cleaned = cleanWord(token);
    if (cleaned) words.push(cleaned);
  }

  const ordered = [];
  const seen = new Set(); // lowercase bodies already added

  const add = (body) => {
    if (!body) return;
    const key = body.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    ordered.push("#" + body);
  };

  // Per-word tags: lowercase form plus a Capitalized variation.
  for (const word of words) {
    add(word.toLowerCase());
    add(capitalize(word));
  }

  // Simple combos of adjacent words: joined lowercase and CamelCase.
  for (let i = 0; i < words.length - 1; i++) {
    const a = words[i];
    const b = words[i + 1];
    add((a + b).toLowerCase());
    add(capitalize(a) + capitalize(b));
  }

  // A combo of every word joined together (a common "brand phrase" tag).
  if (words.length > 2) {
    add(words.map((w) => w.toLowerCase()).join(""));
    add(words.map(capitalize).join(""));
  }

  const keywordCount = ordered.length;

  // Fill remaining slots with curated generic engagement hashtags.
  for (const generic of GENERIC_HASHTAGS) {
    if (ordered.length >= MAX_HASHTAGS) break;
    add(generic);
  }

  const capped = ordered.slice(0, MAX_HASHTAGS);

  return {
    hashtags: capped,
    keywordCount: Math.min(keywordCount, capped.length),
    wordCount: words.length,
  };
}

export default function HashtagGenerator() {
  const [input, setInput] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedTag, setCopiedTag] = useState(null);

  const { hashtags, keywordCount, wordCount } = useMemo(
    () => generateHashtags(input),
    [input]
  );

  const joined = hashtags.join(" ");
  const totalChars = joined.length;
  const hasResults = hashtags.length > 0;

  async function copyText(text) {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      return false;
    }
  }

  async function handleCopyAll() {
    if (!hasResults) return;
    const ok = await copyText(joined);
    if (ok) {
      setCopiedAll(true);
      setCopiedTag(null);
      setTimeout(() => setCopiedAll(false), 1500);
    }
  }

  async function handleCopyTag(tag) {
    const ok = await copyText(tag);
    if (ok) {
      setCopiedTag(tag);
      setCopiedAll(false);
      setTimeout(
        () => setCopiedTag((current) => (current === tag ? null : current)),
        1200
      );
    }
  }

  const fmt = (n) => n.toLocaleString("en-US");

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="hg-input">
            Topic or keywords
          </label>
          <textarea
            id="hg-input"
            className="tool-textarea"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="e.g. sunset beach photography, travel"
            rows={3}
          />
          <p className="tool-note">
            Separate keywords with spaces or commas. Hashtags update instantly.
          </p>
        </div>
      </div>

      {hasResults ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(hashtags.length)}</div>
              <div className="tool-stat-label">Hashtags</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(keywordCount)}</div>
              <div className="tool-stat-label">From your keywords</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(totalChars)}</div>
              <div className="tool-stat-label">Total characters</div>
            </div>
          </div>

          <div className="tool-field">
            <span className="tool-label">Your hashtags</span>
            <div
              style={{
                display: "flex",
                flexWrap: "wrap",
                gap: "0.5rem",
                marginTop: "0.25rem",
              }}
            >
              {hashtags.map((tag) => {
                const isCopied = copiedTag === tag;
                return (
                  <button
                    key={tag}
                    type="button"
                    onClick={() => handleCopyTag(tag)}
                    title="Click to copy"
                    style={{
                      font: "inherit",
                      fontSize: "0.9rem",
                      fontWeight: 600,
                      lineHeight: 1.2,
                      padding: "0.35rem 0.7rem",
                      borderRadius: "999px",
                      border: isCopied
                        ? "1px solid rgba(22,163,74,0.6)"
                        : "1px solid rgba(128,128,128,0.35)",
                      background: isCopied
                        ? "rgba(22,163,74,0.15)"
                        : "rgba(128,128,128,0.08)",
                      color: isCopied ? "#16a34a" : "inherit",
                      cursor: "pointer",
                      transition: "background 0.15s ease, border-color 0.15s ease",
                    }}
                  >
                    {isCopied ? "Copied!" : tag}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="tool-output">{joined}</div>

          <div className="tool-actions">
            <button
              className={copiedAll ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopyAll}
            >
              {copiedAll ? "Copied all!" : "Copy all"}
            </button>
          </div>
        </>
      ) : (
        <p className="tool-note">
          Enter a topic or a few keywords above to generate hashtags.
        </p>
      )}

      <p className="tool-note">
        Hashtags are built right here in your browser from your keywords —
        lowercase and capitalized variations, combinations of adjacent words,
        plus a curated set of popular engagement tags. Duplicates are removed
        and the list is capped at {MAX_HASHTAGS} (the maximum Instagram allows
        per post). Nothing is uploaded or tracked.
      </p>
    </div>
  );
}
