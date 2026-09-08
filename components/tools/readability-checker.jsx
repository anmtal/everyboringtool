"use client";

import { useMemo, useState } from "react";

const SAMPLE =
  "Readability matters more than most writers think. When your sentences run long and your words grow complex, readers slow down, lose the thread, and click away. Short sentences help. Plain words help even more. The best writing feels effortless because someone did the work of making it clear. Aim for the reading level your audience actually reads at, not the level you can write at.";

// Heuristic English syllable counter. Not a dictionary — it uses vowel-group
// rules that are correct for the large majority of words, which is enough for
// readability formulas that work on aggregate counts.
function countSyllables(word) {
  word = word.toLowerCase().replace(/[^a-z]/g, "");
  if (!word) return 0;
  if (word.length <= 3) return 1;

  // Drop trailing silent "e", "es", "ed" (but keep syllabic -le, -ed after t/d).
  let w = word
    .replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, "")
    .replace(/^y/, "");

  const groups = w.match(/[aeiouy]{1,2}/g);
  let count = groups ? groups.length : 0;

  // Words ending in a consonant + "le" get an extra syllable (e.g. "table").
  if (/[^aeiouy]le$/.test(word)) count += 1;

  return Math.max(1, count);
}

function grade(fk) {
  if (fk == null || !isFinite(fk)) return "—";
  if (fk < 1) return "Kindergarten";
  if (fk <= 12) return `Grade ${Math.round(fk)}`;
  if (fk <= 16) return "College";
  return "College graduate";
}

function easeLabel(score) {
  if (score >= 90) return "Very easy";
  if (score >= 70) return "Easy";
  if (score >= 60) return "Standard";
  if (score >= 50) return "Fairly hard";
  if (score >= 30) return "Difficult";
  return "Very confusing";
}

export default function ReadabilityChecker() {
  const [text, setText] = useState(SAMPLE);

  const r = useMemo(() => {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const words = trimmed.match(/[A-Za-z0-9]+(?:['’][A-Za-z0-9]+)*/g) || [];
    const wordCount = words.length;
    if (wordCount === 0) return null;

    // Sentences: split on . ! ? sequences; ignore empties.
    const sentenceParts = trimmed
      .split(/[.!?]+(?:\s|$)/)
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    const sentenceCount = Math.max(1, sentenceParts.length);

    let syllables = 0;
    let complexWords = 0; // 3+ syllables, for Gunning Fog / SMOG
    let charCount = 0;

    for (const raw of words) {
      const s = countSyllables(raw);
      syllables += s;
      charCount += raw.replace(/[^A-Za-z0-9]/g, "").length;
      // Polysyllabic count excludes common suffixed short words per Fog rules,
      // but the simple 3+ heuristic is standard for these calculators.
      if (s >= 3) complexWords += 1;
    }

    const wordsPerSentence = wordCount / sentenceCount;
    const syllablesPerWord = syllables / wordCount;
    const lettersPer100 = (charCount / wordCount) * 100;
    const sentencesPer100 = (sentenceCount / wordCount) * 100;

    // Flesch Reading Ease (0–100, higher = easier)
    const flesch = 206.835 - 1.015 * wordsPerSentence - 84.6 * syllablesPerWord;

    // Flesch-Kincaid Grade Level
    const fkGrade = 0.39 * wordsPerSentence + 11.8 * syllablesPerWord - 15.59;

    // Gunning Fog Index
    const fog = 0.4 * (wordsPerSentence + 100 * (complexWords / wordCount));

    // SMOG Index (needs 30+ sentences ideally; formula still applies)
    const smog = 1.0430 * Math.sqrt(complexWords * (30 / sentenceCount)) + 3.1291;

    // Coleman-Liau Index
    const cli = 0.0588 * lettersPer100 - 0.296 * sentencesPer100 - 15.8;

    // Automated Readability Index
    const ari = 4.71 * (charCount / wordCount) + 0.5 * wordsPerSentence - 21.43;

    const gradeScores = [fkGrade, fog, smog, cli, ari].filter((n) => isFinite(n));
    const avgGrade =
      gradeScores.reduce((a, b) => a + b, 0) / (gradeScores.length || 1);

    return {
      wordCount,
      sentenceCount,
      syllables,
      complexWords,
      charCount,
      wordsPerSentence,
      syllablesPerWord,
      flesch: Math.max(0, Math.min(100, flesch)),
      fkGrade: Math.max(0, fkGrade),
      fog: Math.max(0, fog),
      smog: Math.max(0, smog),
      cli: Math.max(0, cli),
      ari: Math.max(0, ari),
      avgGrade: Math.max(0, avgGrade),
    };
  }, [text]);

  const num = (n, d = 1) =>
    n == null || !isFinite(n) ? "—" : n.toFixed(d);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rc-text">
            Your text
          </label>
          <textarea
            id="rc-text"
            className="tool-textarea"
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Type or paste your content here to check its readability…"
            rows={10}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button
          type="button"
          className="btn"
          onClick={() => setText("")}
        >
          Clear
        </button>
        <button
          type="button"
          className="btn"
          onClick={() => setText(SAMPLE)}
        >
          Load sample
        </button>
      </div>

      {!r ? (
        <p className="tool-note">
          Enter some text above to see its readability scores. Aim for a few
          full sentences — the formulas need sentence and word structure to work.
        </p>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Flesch Reading Ease — {easeLabel(r.flesch)}
            </p>
            <div className="tool-result-value">{num(r.flesch, 0)} / 100</div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Average grade level (5 formulas)
            </p>
            <div className="tool-result-value">{grade(r.avgGrade)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{grade(r.fkGrade)}</div>
              <div className="tool-stat-label">Flesch-Kincaid</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{grade(r.fog)}</div>
              <div className="tool-stat-label">Gunning Fog</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{grade(r.smog)}</div>
              <div className="tool-stat-label">SMOG Index</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{grade(r.cli)}</div>
              <div className="tool-stat-label">Coleman-Liau</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{grade(r.ari)}</div>
              <div className="tool-stat-label">Automated Readability</div>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {r.wordCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Words</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {r.sentenceCount.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Sentences</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {r.syllables.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Syllables</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{num(r.wordsPerSentence)}</div>
              <div className="tool-stat-label">Words / sentence</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {r.complexWords.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Complex words (3+ syllables)</div>
            </div>
          </div>

          <p className="tool-note">
            Higher Flesch Reading Ease means easier text (aim for 60+ for a
            general audience). Grade-level scores estimate the U.S. school grade
            needed to understand the text on first reading — most web content
            targets grade 7–9. Syllables are counted with an English heuristic,
            so scores are close estimates rather than dictionary-exact. Nothing
            is uploaded — all analysis happens live in your browser.
          </p>
        </>
      )}
    </div>
  );
}
