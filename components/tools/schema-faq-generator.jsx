"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

let nextId = 3;

const EXAMPLE = [
  {
    id: 1,
    q: "Is the FAQ schema generator free to use?",
    a: "Yes. It is completely free, needs no sign-up, and runs entirely in your browser. Your questions and answers never leave your device.",
  },
  {
    id: 2,
    q: "Where do I put the generated code?",
    a: "Paste the <script type=\"application/ld+json\"> block into the <head> or anywhere in the <body> of the page that shows the same FAQ content to visitors.",
  },
];

// Strip HTML tags to a plain-text length estimate (schema answers may contain
// limited inline HTML, but Google counts the rendered text).
function textLength(html) {
  return String(html)
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .trim().length;
}

// JSON.stringify already escapes quotes, backslashes and control chars for us,
// so building the object and stringifying is the safe way to emit JSON-LD.
function buildSchema(pairs, pretty) {
  const clean = pairs
    .map((p) => ({ q: p.q.trim(), a: p.a.trim() }))
    .filter((p) => p.q && p.a);

  if (clean.length === 0) return "";

  const obj = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: clean.map((p) => ({
      "@type": "Question",
      name: p.q,
      acceptedAnswer: {
        "@type": "Answer",
        text: p.a,
      },
    })),
  };

  const json = pretty ? JSON.stringify(obj, null, 2) : JSON.stringify(obj);
  return '<script type="application/ld+json">\n' + json + "\n</script>";
}

export default function SchemaFaqGenerator() {
  const [pairs, setPairs] = useState(EXAMPLE);
  const [pretty, setPretty] = useState(true);
  const [copied, setCopied] = useState(false);

  const output = useMemo(() => buildSchema(pairs, pretty), [pairs, pretty]);

  const validPairs = useMemo(
    () => pairs.filter((p) => p.q.trim() && p.a.trim()),
    [pairs]
  );

  // Non-blocking guidance a real user cares about before pasting into a page.
  const warnings = useMemo(() => {
    const w = [];
    pairs.forEach((p, i) => {
      const q = p.q.trim();
      const a = p.a.trim();
      if (q && !a) w.push(`Question ${i + 1} has no answer — it was skipped.`);
      if (!q && a) w.push(`Item ${i + 1} has an answer but no question — it was skipped.`);
      if (a && textLength(a) > 5000) {
        w.push(
          `Answer ${i + 1} is very long. Keep answers concise; overly long answers may not be eligible for rich results.`
        );
      }
    });
    if (validPairs.length === 1) {
      w.push(
        "Google recommends the FAQ markup describe a real FAQ list — a single question still validates but adds little."
      );
    }
    return w;
  }, [pairs, validPairs.length]);

  function updatePair(id, field, value) {
    setPairs((prev) =>
      prev.map((p) => (p.id === id ? { ...p, [field]: value } : p))
    );
    setCopied(false);
  }

  function addPair() {
    setPairs((prev) => [...prev, { id: nextId++, q: "", a: "" }]);
    setCopied(false);
  }

  function removePair(id) {
    setPairs((prev) => (prev.length > 1 ? prev.filter((p) => p.id !== id) : prev));
    setCopied(false);
  }

  function loadExample() {
    setPairs([
      { id: nextId++, q: EXAMPLE[0].q, a: EXAMPLE[0].a },
      { id: nextId++, q: EXAMPLE[1].q, a: EXAMPLE[1].a },
    ]);
    setCopied(false);
  }

  function clearAll() {
    setPairs([{ id: nextId++, q: "", a: "" }]);
    setCopied(false);
  }

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
    const blob = new Blob([output], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "faq-schema.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        {pairs.map((p, i) => (
          <div className="tool-field" key={p.id}>
            <label className="tool-label" htmlFor={`faq-q-${p.id}`}>
              Question {i + 1}
            </label>
            <input
              className="tool-input"
              id={`faq-q-${p.id}`}
              type="text"
              value={p.q}
              onChange={(e) => updatePair(p.id, "q", e.target.value)}
              placeholder="e.g. How long does shipping take?"
              autoComplete="off"
            />
            <label
              className="tool-label"
              htmlFor={`faq-a-${p.id}`}
              style={{ marginTop: 8 }}
            >
              Answer {i + 1}
            </label>
            <textarea
              className="tool-textarea"
              id={`faq-a-${p.id}`}
              value={p.a}
              rows={3}
              onChange={(e) => updatePair(p.id, "a", e.target.value)}
              placeholder="Write the answer exactly as it appears on the page."
            />
            <div className="tool-actions">
              <button
                className="btn"
                type="button"
                onClick={() => removePair(p.id)}
                disabled={pairs.length <= 1}
              >
                Remove
              </button>
            </div>
          </div>
        ))}

        <div className="tool-actions">
          <button className="btn btn-primary" type="button" onClick={addPair}>
            + Add question
          </button>
          <button className="btn" type="button" onClick={loadExample}>
            Load example
          </button>
          <button className="btn" type="button" onClick={clearAll}>
            Clear all
          </button>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="faq-pretty">
            <input
              id="faq-pretty"
              type="checkbox"
              checked={pretty}
              onChange={(e) => {
                setPretty(e.target.checked);
                setCopied(false);
              }}
              style={{ marginRight: 8, verticalAlign: "middle" }}
            />
            Pretty-print (indented) JSON
          </label>
        </div>
      </div>

      {output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{validPairs.length}</div>
              <div className="tool-stat-label">
                question{validPairs.length === 1 ? "" : "s"} in schema
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{output.length}</div>
              <div className="tool-stat-label">characters of code</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy code"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .html
              </button>
            </div>
            <label className="tool-label" htmlFor="faq-output">
              FAQPage JSON-LD
            </label>
            <pre className="tool-output" id="faq-output">
              {output}
            </pre>
          </div>

          {warnings.length ? (
            <div className="tool-note">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <p className="tool-note">
            Paste this block into the page that shows the same FAQ to visitors.
            The questions and answers in your markup must match the visible page
            content, or Google may ignore or penalize the markup. Test the result
            with Google&apos;s Rich Results Test after publishing.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Add at least one question and answer above to generate valid
          FAQPage schema markup. Everything runs in your browser — nothing is
          uploaded.
        </p>
      )}
    </div>
  );
}
