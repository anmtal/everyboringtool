"use client";

import { useMemo, useState } from "react";
import { fromRoman, toRoman } from "../../lib/roman";
import PrintSheetButton from "./PrintSheetButton";

// Practice sheet that works two ways: answer on screen and press "Check", or
// print it (questions on page 1, answer key on page 2). A seeded generator makes
// every version reproducible: the version number on the sheet regenerates it.

const LEVELS = {
  "1-20": { label: "1 to 20", min: 1, max: 20 },
  "1-100": { label: "1 to 100", min: 1, max: 100 },
  "1-1000": { label: "1 to 1000", min: 1, max: 1000 },
  years: { label: "Years 1900 to 2099", min: 1900, max: 2099 },
};

const TYPES = {
  "to-numeral": "Number to numeral",
  "to-number": "Numeral to number",
  mixed: "Mixed (both directions)",
  grid: "Fill in the 1–100 grid",
};

const QUESTIONS = 20;
const GRID_BLANKS = 50;

// mulberry32: tiny deterministic PRNG, good enough for shuffling a worksheet.
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickDistinct(rand, min, max, count) {
  const pool = [];
  for (let n = min; n <= max; n++) pool.push(n);
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  return pool.slice(0, Math.min(count, pool.length));
}

function buildSheet(type, level, seed) {
  const rand = rng(seed * 7919 + type.length * 31 + level.length);
  if (type === "grid") {
    const blanks = new Set(pickDistinct(rand, 1, 100, GRID_BLANKS));
    return { grid: true, blanks };
  }
  const { min, max } = LEVELS[level];
  const values = pickDistinct(rand, min, max, QUESTIONS);
  const items = values.map((n) => {
    const dir = type === "mixed" ? (rand() < 0.5 ? "to-numeral" : "to-number") : type;
    return { n, dir, roman: toRoman(n) };
  });
  return { grid: false, items };
}

function isRight(item, answer) {
  const a = String(answer || "").trim();
  if (!a) return null;
  if (item.dir === "to-numeral") return fromRoman(a) === item.n;
  return /^\d[\d,]*$/.test(a) && parseInt(a.replace(/,/g, ""), 10) === item.n;
}

export default function RomanPractice({ source }) {
  const [type, setType] = useState("to-numeral");
  const [level, setLevel] = useState("1-100");
  const [seed, setSeed] = useState(1);
  const [answers, setAnswers] = useState({});
  const [checked, setChecked] = useState(false);

  const sheet = useMemo(() => buildSheet(type, level, seed), [type, level, seed]);

  function reset(next) {
    setAnswers({});
    setChecked(false);
    next();
  }

  const gridItems = useMemo(() => {
    if (!sheet.grid) return [];
    return Array.from(sheet.blanks).map((n) => ({ n, dir: "to-numeral", roman: toRoman(n) }));
  }, [sheet]);
  const gradable = sheet.grid ? gridItems : sheet.items;
  const score = checked ? gradable.filter((it) => isRight(it, answers[it.n]) === true).length : 0;

  const title = sheet.grid
    ? "Roman numerals 1–100: fill in the grid"
    : `Roman numerals practice: ${TYPES[type].toLowerCase()}, ${LEVELS[level].label}`;
  const version = `Version ${seed}`;

  const setAnswer = (n, v) => setAnswers((a) => ({ ...a, [n]: v }));

  function mark(it) {
    if (!checked) return null;
    const r = isRight(it, answers[it.n]);
    if (r === true) return <span className="rn-mark is-right" aria-label="correct">✓</span>;
    return (
      <span className="rn-mark is-wrong">
        <span aria-hidden="true">✗</span><span className="sr-only">Not quite. The answer is</span> {it.dir === "to-numeral" ? it.roman : String(it.n)}
      </span>
    );
  }

  return (
    <div className="rn-practice">
      <div className="rn-controls chart-noprint">
        <div className="tool-field">
          <label className="tool-label" htmlFor="rn-ws-type">Sheet type</label>
          <select id="rn-ws-type" className="tool-select" value={type} onChange={(e) => reset(() => setType(e.target.value))}>
            {Object.entries(TYPES).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="rn-ws-level">Level</label>
          <select id="rn-ws-level" className="tool-select" value={level} disabled={type === "grid"} onChange={(e) => reset(() => setLevel(e.target.value))}>
            {Object.entries(LEVELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
        <div className="tool-actions" style={{ alignSelf: "end" }}>
          <button type="button" className="btn btn-sm" onClick={() => reset(() => setSeed(1 + Math.floor(Math.random() * 99999)))}>New version</button>
          <PrintSheetButton sheet="worksheet" chart="roman-numerals" label="Print worksheet + answer key" className="btn btn-sm btn-primary" />
        </div>
      </div>

      <div className="rn-ws">
        <div className="rn-ws-head">
          <h3 className="rn-ws-title">{title}</h3>
          <p className="rn-ws-meta">{version} · {sheet.grid ? `${GRID_BLANKS} blanks` : `${QUESTIONS} questions`}</p>
          <p className="rn-ws-name">Name: <span className="rn-line" /> Date: <span className="rn-line rn-line-short" /></p>
        </div>

        {sheet.grid ? (
          <div className="rn-table-wrap">
            <table className="rn-table rn-grid rn-ws-grid">
              <caption className="sr-only">Fill in the missing Roman numerals from 1 to 100</caption>
              <tbody>
                {Array.from({ length: 10 }, (_, row) => (
                  <tr key={row}>
                    {Array.from({ length: 10 }, (_, col) => {
                      const n = row * 10 + col + 1;
                      const blank = sheet.blanks.has(n);
                      const it = { n, dir: "to-numeral", roman: toRoman(n) };
                      return (
                        <td key={col}>
                          <span className="rn-n">{n}</span>
                          {blank ? (
                            <>
                              <input
                                className="rn-ws-input"
                                aria-label={`Roman numeral for ${n}`}
                                autoComplete="off"
                                spellCheck={false}
                                value={answers[n] || ""}
                                onChange={(e) => setAnswer(n, e.target.value)}
                              />
                              {mark(it)}
                            </>
                          ) : (
                            <span className="rn-r">{toRoman(n)}</span>
                          )}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <ol className="rn-ws-list">
            {sheet.items.map((it) => (
              <li key={`${it.dir}-${it.n}`}>
                <label htmlFor={`rn-q-${it.n}`} className="rn-ws-q">
                  {it.dir === "to-numeral" ? String(it.n) : it.roman} =
                </label>
                <input
                  id={`rn-q-${it.n}`}
                  className="rn-ws-input"
                  autoComplete="off"
                  spellCheck={false}
                  inputMode={it.dir === "to-number" ? "numeric" : "text"}
                  aria-label={it.dir === "to-numeral" ? `Roman numeral for ${it.n}` : `Number for ${it.roman}`}
                  value={answers[it.n] || ""}
                  onChange={(e) => setAnswer(it.n, e.target.value)}
                />
                {mark(it)}
              </li>
            ))}
          </ol>
        )}
        <p className="chart-print-source">{source}</p>

        <div className="tool-actions chart-noprint" style={{ marginTop: 14 }}>
          <button type="button" className="btn btn-sm btn-primary" onClick={() => setChecked(true)}>Check my answers</button>
          {checked ? (
            <span role="status" aria-live="polite">
              <strong>{score}</strong> of {gradable.length} correct
            </span>
          ) : null}
        </div>

        <details className="rn-key">
          <summary className="chart-noprint">Show the answer key</summary>
          <h3 className="rn-ws-title">Answer key: {title}</h3>
          <p className="rn-ws-meta">{version}</p>
          {sheet.grid ? (
            <ol className="rn-key-list rn-key-grid">
              {Array.from(sheet.blanks).sort((a, b) => a - b).map((n) => (
                <li key={n} value={n}>{toRoman(n)}</li>
              ))}
            </ol>
          ) : (
            <ol className="rn-key-list">
              {sheet.items.map((it) => (
                <li key={`${it.dir}-${it.n}`}>
                  {it.dir === "to-numeral" ? `${it.n} = ${it.roman}` : `${it.roman} = ${it.n}`}
                </li>
              ))}
            </ol>
          )}
          <p className="chart-print-source">{source}</p>
        </details>
      </div>
    </div>
  );
}
