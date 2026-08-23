"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Classic lorem ipsum word bank. Kept inline so the tool has no dependencies.
const WORD_BANK = [
  "lorem", "ipsum", "dolor", "sit", "amet", "consectetur", "adipiscing",
  "elit", "sed", "do", "eiusmod", "tempor", "incididunt", "ut", "labore",
  "et", "dolore", "magna", "aliqua", "enim", "ad", "minim", "veniam",
  "quis", "nostrud", "exercitation", "ullamco", "laboris", "nisi", "aliquip",
  "ex", "ea", "commodo", "consequat", "duis", "aute", "irure", "in",
  "reprehenderit", "voluptate", "velit", "esse", "cillum", "eu", "fugiat",
  "nulla", "pariatur", "excepteur", "sint", "occaecat", "cupidatat", "non",
  "proident", "sunt", "culpa", "qui", "officia", "deserunt", "mollit",
  "anim", "id", "est", "laborum", "perspiciatis", "unde", "omnis", "iste",
  "natus", "error", "voluptatem", "accusantium", "doloremque", "laudantium",
  "totam", "rem", "aperiam", "eaque", "ipsa", "quae", "ab", "illo",
  "inventore", "veritatis", "quasi", "architecto", "beatae", "vitae", "dicta",
  "explicabo", "aspernatur", "odit", "aut", "fugit", "consequuntur", "magni",
  "dolores", "eos", "ratione", "sequi", "nesciunt", "neque", "porro",
  "quisquam", "dolorem", "adipisci", "numquam", "eius", "modi", "tempora",
  "incidunt", "magnam", "quaerat", "voluptatem", "aliquam", "quia", "voluptas",
  "nostrum", "exercitationem", "corporis", "suscipit", "laboriosam", "aliquid",
  "commodi", "autem", "vel", "eum", "iure", "quam", "nihil", "molestiae",
  "illum", "quo", "fugiat",
];

const LOREM_START = "lorem ipsum dolor sit amet consectetur adipiscing elit";

const UNITS = [
  { value: "paragraphs", label: "Paragraphs" },
  { value: "sentences", label: "Sentences" },
  { value: "words", label: "Words" },
];

// Deterministic-ish random helpers (Math.random is fine for placeholder text).
function randInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function pickWord() {
  return WORD_BANK[Math.floor(Math.random() * WORD_BANK.length)];
}

function capitalize(word) {
  return word.charAt(0).toUpperCase() + word.slice(1);
}

// Build a list of `count` words. When `seed` is true, the first words are the
// classic "lorem ipsum dolor sit amet…" opener, then random words fill the rest.
function buildWords(count, seed) {
  const words = [];
  if (seed) {
    const opener = LOREM_START.split(" ");
    for (let i = 0; i < count && i < opener.length; i++) {
      words.push(opener[i]);
    }
  }
  while (words.length < count) {
    words.push(pickWord());
  }
  return words.slice(0, count);
}

// Assemble a single sentence of a natural-looking word count, optionally
// consuming the seeded opener words passed in `openerWords`.
function buildSentence(openerWords) {
  const length = randInt(8, 16);
  const words = [];
  for (let i = 0; i < length; i++) {
    if (openerWords && openerWords.length) {
      words.push(openerWords.shift());
    } else {
      words.push(pickWord());
    }
  }
  // Sprinkle a comma somewhere in the middle for a bit of rhythm.
  if (words.length > 6 && Math.random() > 0.4) {
    const commaAt = randInt(2, words.length - 3);
    words[commaAt] = words[commaAt] + ",";
  }
  let sentence = words.join(" ");
  sentence = capitalize(sentence);
  return sentence + ".";
}

function generate(unit, count, seed) {
  if (unit === "words") {
    const words = buildWords(count, seed);
    if (words.length === 0) return "";
    return capitalize(words[0]) + (words.length > 1 ? " " + words.slice(1).join(" ") : "");
  }

  if (unit === "sentences") {
    const opener = seed ? LOREM_START.split(" ") : null;
    const sentences = [];
    for (let i = 0; i < count; i++) {
      sentences.push(buildSentence(i === 0 ? opener : null));
    }
    return sentences.join(" ");
  }

  // paragraphs
  const opener = seed ? LOREM_START.split(" ") : null;
  const paragraphs = [];
  for (let p = 0; p < count; p++) {
    const sentenceCount = randInt(3, 6);
    const sentences = [];
    for (let s = 0; s < sentenceCount; s++) {
      const useOpener = p === 0 && s === 0 ? opener : null;
      sentences.push(buildSentence(useOpener));
    }
    paragraphs.push(sentences.join(" "));
  }
  return paragraphs.join("\n\n");
}

const MAX_COUNT = 500;

export default function LoremIpsumGenerator() {
  const [unit, setUnit] = useState("paragraphs");
  const [countInput, setCountInput] = useState("3");
  const [seed, setSeed] = useState(true);
  const [output, setOutput] = useState("");
  const [copied, setCopied] = useState(false);

  const count = useMemo(() => {
    const n = parseInt(countInput, 10);
    if (!Number.isFinite(n) || n < 1) return 0;
    return Math.min(n, MAX_COUNT);
  }, [countInput]);

  const stats = useMemo(() => {
    if (!output) return { words: 0, characters: 0, paragraphs: 0 };
    const words = (output.trim().match(/\S+/g) || []).length;
    const paragraphs = output.split(/\n\n+/).filter((p) => p.trim()).length;
    return { words, characters: output.length, paragraphs };
  }, [output]);

  const fmt = (n) => n.toLocaleString("en-US");

  function handleUnitChange(e) {
    setUnit(e.target.value);
  }

  function handleCountChange(e) {
    // Keep only digits so parseInt never sees junk; empty is allowed while typing.
    const cleaned = e.target.value.replace(/[^0-9]/g, "");
    setCountInput(cleaned);
  }

  function handleGenerate() {
    if (count < 1) {
      setOutput("");
      return;
    }
    setOutput(generate(unit, count, seed));
    setCopied(false);
  }

  function handleClear() {
    setOutput("");
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

  const unitLabel = UNITS.find((u) => u.value === unit)?.label.toLowerCase() || "paragraphs";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lorem-unit">
              Generate
            </label>
            <select
              id="lorem-unit"
              className="tool-select"
              value={unit}
              onChange={handleUnitChange}
            >
              {UNITS.map((u) => (
                <option key={u.value} value={u.value}>
                  {u.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="lorem-count">
              How many
            </label>
            <input
              id="lorem-count"
              className="tool-input"
              type="text"
              inputMode="numeric"
              value={countInput}
              onChange={handleCountChange}
              placeholder="3"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" style={{ display: "flex", alignItems: "center", gap: "0.5rem", cursor: "pointer" }}>
            <input
              type="checkbox"
              checked={seed}
              onChange={(e) => setSeed(e.target.checked)}
              style={{ width: "auto", margin: 0 }}
            />
            Start with &ldquo;Lorem ipsum dolor sit amet&hellip;&rdquo;
          </label>
        </div>
      </div>

      {count >= MAX_COUNT ? (
        <p className="tool-note">Capped at {fmt(MAX_COUNT)} {unitLabel} per generation.</p>
      ) : null}

      <div className="tool-actions">
        <button className="btn btn-primary" type="button" onClick={handleGenerate}>
          Generate
        </button>
        {output ? (
          <button className="btn" type="button" onClick={handleClear}>
            Clear
          </button>
        ) : null}
      </div>

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy text"}
            </button>
          </div>
          <label className="tool-label" htmlFor="lorem-output">
            Placeholder text
          </label>
          <pre className="tool-output" id="lorem-output">
            {output}
          </pre>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(stats.words)}</div>
              <div className="tool-stat-label">Words</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(stats.characters)}</div>
              <div className="tool-stat-label">Characters</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{fmt(stats.paragraphs)}</div>
              <div className="tool-stat-label">Paragraphs</div>
            </div>
          </div>
        </div>
      ) : (
        <p className="tool-note">
          Choose paragraphs, sentences, or words, set a count, then press
          Generate. Everything runs live in your browser and nothing is uploaded.
        </p>
      )}
    </div>
  );
}
