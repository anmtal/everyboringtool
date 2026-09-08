"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Strip diacritics so "Àà" style accents compare like their base letters
// (only matters when "ignore accents" is on).
function stripAccents(str) {
  return str.normalize("NFD").replace(/[̀-ͯ]/g, "");
}

// Build the string that actually gets compared, based on the chosen options.
function normalize(text, { ignoreCase, ignoreNonAlnum, ignoreAccents }) {
  let out = text;
  if (ignoreAccents) out = stripAccents(out);
  if (ignoreCase) out = out.toLowerCase();
  if (ignoreNonAlnum) {
    // Keep letters and numbers only (Unicode-aware); drop spaces, punctuation.
    out = out.replace(/[^\p{L}\p{N}]/gu, "");
  }
  return out;
}

// Reverse by code points so astral characters (emoji, some CJK) aren't split.
function reverseStr(str) {
  return Array.from(str).reverse().join("");
}

function findWordPalindromes(text) {
  const words = text.match(/\p{L}[\p{L}\p{N}]*/gu) || [];
  const seen = new Set();
  const result = [];
  for (const w of words) {
    const lower = w.toLowerCase();
    if (lower.length < 2) continue; // single letters are trivial palindromes
    if (lower === reverseStr(lower) && !seen.has(lower)) {
      seen.add(lower);
      result.push(w);
    }
  }
  return result;
}

export default function PalindromeChecker() {
  const [text, setText] = useState("A man, a plan, a canal: Panama");
  const [ignoreCase, setIgnoreCase] = useState(true);
  const [ignoreNonAlnum, setIgnoreNonAlnum] = useState(true);
  const [ignoreAccents, setIgnoreAccents] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const raw = text;
    if (!raw.trim()) return null;

    const normalized = normalize(raw, {
      ignoreCase,
      ignoreNonAlnum,
      ignoreAccents,
    });
    const reversed = reverseStr(normalized);
    const isPalindrome = normalized.length > 0 && normalized === reversed;

    // Find the first mismatching pair of characters (for the "why not")
    // by walking inward from both ends of the compared string.
    let mismatchAt = -1;
    const chars = Array.from(normalized);
    for (let i = 0, j = chars.length - 1; i < j; i++, j--) {
      if (chars[i] !== chars[j]) {
        mismatchAt = i;
        break;
      }
    }

    return {
      normalized,
      reversed,
      isPalindrome,
      comparedLength: chars.length,
      rawLength: Array.from(raw).length,
      mismatch:
        mismatchAt >= 0
          ? {
              left: chars[mismatchAt],
              right: chars[chars.length - 1 - mismatchAt],
              position: mismatchAt + 1,
            }
          : null,
      wordPalindromes: findWordPalindromes(raw),
    };
  }, [text, ignoreCase, ignoreNonAlnum, ignoreAccents]);

  const loadExample = () => {
    setText("Was it a car or a cat I saw?");
  };

  const clearAll = () => setText("");

  const handleCopy = async () => {
    if (!result) return;
    const verdict = result.isPalindrome
      ? "is a palindrome"
      : "is NOT a palindrome";
    await copyText(`"${text}" ${verdict}.`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="pal-input">
            Word, phrase, or number to check
          </label>
          <textarea
            id="pal-input"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="e.g. racecar, or “A man, a plan, a canal: Panama”, or 12321"
            rows={4}
          />
        </div>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pal-case">
              <input
                id="pal-case"
                type="checkbox"
                checked={ignoreCase}
                onChange={(e) => setIgnoreCase(e.target.checked)}
              />{" "}
              Ignore uppercase / lowercase
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pal-punct">
              <input
                id="pal-punct"
                type="checkbox"
                checked={ignoreNonAlnum}
                onChange={(e) => setIgnoreNonAlnum(e.target.checked)}
              />{" "}
              Ignore spaces &amp; punctuation
            </label>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pal-accents">
              <input
                id="pal-accents"
                type="checkbox"
                checked={ignoreAccents}
                onChange={(e) => setIgnoreAccents(e.target.checked)}
              />{" "}
              Ignore accents
            </label>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={loadExample}>
          Load example
        </button>
        <button
          type="button"
          className="btn"
          onClick={clearAll}
          disabled={!text}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn btn-primary"
          onClick={handleCopy}
          disabled={!result}
        >
          {copied ? "Copied!" : "Copy result"}
        </button>
      </div>

      {!result ? (
        <p className="tool-note">
          Type a word, phrase, or number above. This tool tells you instantly
          whether it reads the same forwards and backwards.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Result</p>
            <div className="tool-result-value">
              {result.comparedLength === 0
                ? "Nothing to check"
                : result.isPalindrome
                ? "✓ Yes — this is a palindrome"
                : "✗ No — this is not a palindrome"}
            </div>
          </div>

          {result.comparedLength > 0 && (
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{result.rawLength}</div>
                <div className="tool-stat-label">Characters typed</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{result.comparedLength}</div>
                <div className="tool-stat-label">Characters compared</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {result.wordPalindromes.length}
                </div>
                <div className="tool-stat-label">Palindrome words</div>
              </div>
            </div>
          )}

          {result.comparedLength > 0 && (
            <div className="tool-field">
              <p className="tool-result-label">Compared vs. reversed</p>
              <pre className="tool-output">
                {`Forwards:  ${result.normalized}\nBackwards: ${result.reversed}`}
              </pre>
            </div>
          )}

          <p className="tool-note">
            {result.comparedLength === 0
              ? "After removing spaces and punctuation there was nothing left to compare. Turn off “Ignore spaces & punctuation” to check the raw text."
              : result.isPalindrome
              ? "The compared text reads identically in both directions."
              : result.mismatch
              ? `First mismatch at position ${result.mismatch.position}: “${result.mismatch.left}” from the start doesn’t match “${result.mismatch.right}” from the end.`
              : "The text is not symmetric."}
            {result.wordPalindromes.length > 0
              ? ` Palindrome words found: ${result.wordPalindromes.join(", ")}.`
              : ""}{" "}
            Everything is checked live in your browser — nothing is uploaded.
          </p>
        </>
      )}
    </div>
  );
}
