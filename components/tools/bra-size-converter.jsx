"use client";

import { useState, useMemo } from "react";

// Band is deterministic (+2in = +5cm). Cups are indexed by the bust−band inch
// difference and each system emits its own letter for that index — this keeps
// above-D letters consistent instead of chaining letter-to-letter.
const BANDS = [
  { US: "28", UK: "28", EU: "60", FR: "75", AU: "6" },
  { US: "30", UK: "30", EU: "65", FR: "80", AU: "8" },
  { US: "32", UK: "32", EU: "70", FR: "85", AU: "10" },
  { US: "34", UK: "34", EU: "75", FR: "90", AU: "12" },
  { US: "36", UK: "36", EU: "80", FR: "95", AU: "14" },
  { US: "38", UK: "38", EU: "85", FR: "100", AU: "16" },
  { US: "40", UK: "40", EU: "90", FR: "105", AU: "18" },
  { US: "42", UK: "42", EU: "95", FR: "110", AU: "20" },
  { US: "44", UK: "44", EU: "100", FR: "115", AU: "22" },
];
const CUPS = {
  US: ["AA", "A", "B", "C", "D", "DD", "DDD/F", "G", "H", "I", "J"],
  UK: ["AA", "A", "B", "C", "D", "DD", "E", "F", "FF", "G", "GG", "H"],
  AU: ["AA", "A", "B", "C", "D", "DD", "E", "F", "FF", "G", "GG", "H"],
  EU: ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],
  FR: ["AA", "A", "B", "C", "D", "E", "F", "G", "H", "I", "J", "K"],
};
const SYSTEMS = [
  { key: "US", label: "US" },
  { key: "UK", label: "UK" },
  { key: "EU", label: "EU" },
  { key: "FR", label: "France" },
  { key: "AU", label: "Australia" },
];

const CM_PER_IN = 2.54;
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

// Given a band row and a cup index, emit each system's band+cup.
function buildCards(bandRow, cupIndex) {
  return SYSTEMS.map((s) => ({
    key: s.key,
    label: s.label,
    band: bandRow[s.key],
    cup: CUPS[s.key][cupIndex] || "—",
  }));
}

export default function BraSizeConverter() {
  const [mode, setMode] = useState("known");

  // ---- "I know my size" mode ----
  const [sys, setSys] = useState("US");
  const [band, setBand] = useState("34");
  const [cup, setCup] = useState("C");

  const bandOptions = BANDS.map((b) => b[sys]);
  const cupOptions = CUPS[sys];
  const safeBand = bandOptions.includes(band) ? band : bandOptions[3];
  const safeCup = cupOptions.includes(cup) ? cup : "C";

  const knownResult = useMemo(() => {
    const bandRow = BANDS.find((b) => b[sys] === safeBand);
    const cupIndex = CUPS[sys].indexOf(safeCup);
    if (!bandRow || cupIndex < 0) return null;
    return buildCards(bandRow, cupIndex);
  }, [sys, safeBand, safeCup]);

  // ---- "Calculate from measurements" mode ----
  const [unit, setUnit] = useState("in");
  const [under, setUnder] = useState("");
  const [bust, setBust] = useState("");

  const measure = useMemo(() => {
    const u = parseFloat(under);
    const b = parseFloat(bust);
    if (!(u > 0) || !(b > 0)) return null;

    const toIn = (v) => (unit === "cm" ? v / CM_PER_IN : v);
    const underIn = toIn(u);
    const bustIn = toIn(b);

    // Standard band method: round underbust to the nearest inch, then +4 if even
    // / +5 if odd (always lands on an even band). This is what published size
    // charts assume, which is exactly why US↔UK↔EU↔FR line up in the table above.
    const ubRound = Math.round(underIn);
    const rawBand = ubRound + (ubRound % 2 === 0 ? 4 : 5);
    const bandNum = clamp(rawBand, 28, 44);
    const bandRow = BANDS.find((r) => r.US === String(bandNum));

    // Cup: one letter per inch of bust-minus-band difference.
    const maxIdx = CUPS.US.length - 1;
    const rawDiff = Math.round(bustIn) - bandNum;
    const cupIndex = clamp(rawDiff, 0, maxIdx);

    const cards = buildCards(bandRow, cupIndex);
    const us = cards.find((c) => c.key === "US");
    return {
      cards,
      usSize: `${us.band}${us.cup}`,
      warnSmallBust: rawDiff < 0,
      warnBand: rawBand !== bandNum,
      warnCup: rawDiff > maxIdx,
    };
  }, [unit, under, bust]);

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="How to enter your size" style={{ marginBottom: 16 }}>
        <button
          type="button" role="tab" aria-selected={mode === "known"}
          className={`seg-btn ${mode === "known" ? "is-active" : ""}`}
          onClick={() => setMode("known")}
        >
          I know my size
        </button>
        <button
          type="button" role="tab" aria-selected={mode === "measure"}
          className={`seg-btn ${mode === "measure" ? "is-active" : ""}`}
          onClick={() => setMode("measure")}
        >
          Calculate from measurements
        </button>
      </div>

      {mode === "known" ? (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="bra-sys">Your size is a</label>
              <select id="bra-sys" className="tool-input" value={sys} onChange={(e) => setSys(e.target.value)}>
                {SYSTEMS.map((s) => <option key={s.key} value={s.key}>{s.label} size</option>)}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bra-band">Band</label>
              <select id="bra-band" className="tool-input" value={safeBand} onChange={(e) => setBand(e.target.value)}>
                {bandOptions.map((b) => <option key={b} value={b}>{b}</option>)}
              </select>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bra-cup">Cup</label>
              <select id="bra-cup" className="tool-input" value={safeCup} onChange={(e) => setCup(e.target.value)}>
                {cupOptions.map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>

          {knownResult && (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">{sys} {safeBand}{safeCup} converts to</p>
              <div className="csc-cards">
                {knownResult.map((r) => (
                  <div key={r.key} className={`csc-card ${r.key === sys ? "is-input" : ""}`}>
                    <div className="csc-card-country">{r.label}</div>
                    <div className="csc-card-size">{r.band}{r.cup}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="tool-note">
            Band sizes convert exactly, but cup letters diverge between systems above a D (a US DD is a UK DD but an EU E) —
            this tool keeps them aligned by the true bust-minus-band measurement. Asian brands often run a cup smaller, and
            fit varies by brand, so when a label publishes its own chart, trust it. Free, runs in your browser.
          </p>
        </>
      ) : (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <span className="tool-label" id="bra-unit-label">Measure in</span>
              <div className="seg-toggle" role="group" aria-labelledby="bra-unit-label">
                <button
                  type="button" aria-pressed={unit === "in"}
                  className={`seg-btn ${unit === "in" ? "is-active" : ""}`}
                  onClick={() => setUnit("in")}
                >
                  Inches
                </button>
                <button
                  type="button" aria-pressed={unit === "cm"}
                  className={`seg-btn ${unit === "cm" ? "is-active" : ""}`}
                  onClick={() => setUnit("cm")}
                >
                  Cm
                </button>
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bra-under">Under-bust (ribcage)</label>
              <input
                id="bra-under" className="tool-input" type="number" inputMode="decimal"
                min="0" step="0.1" placeholder={unit === "cm" ? "e.g. 76" : "e.g. 30"}
                value={under} onChange={(e) => setUnder(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="bra-bust">Bust (fullest)</label>
              <input
                id="bra-bust" className="tool-input" type="number" inputMode="decimal"
                min="0" step="0.1" placeholder={unit === "cm" ? "e.g. 86" : "e.g. 34"}
                value={bust} onChange={(e) => setBust(e.target.value)}
              />
            </div>
          </div>

          {measure ? (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">Your measurements suggest a US {measure.usSize}</p>
              <div className="csc-cards">
                {measure.cards.map((r) => (
                  <div key={r.key} className={`csc-card ${r.key === "US" ? "is-input" : ""}`}>
                    <div className="csc-card-country">{r.label}</div>
                    <div className="csc-card-size">{r.band}{r.cup}</div>
                  </div>
                ))}
              </div>
              {measure.warnSmallBust && (
                <p className="tool-note">
                  Your bust came out smaller than your under-bust — worth a re-measure, since the bust is taken around the
                  fullest part. We've shown the smallest cup for now.
                </p>
              )}
              {measure.warnBand && (
                <p className="tool-note">That under-bust is outside our chart, so we've used the nearest band we cover.</p>
              )}
              {measure.warnCup && (
                <p className="tool-note">
                  That's a bigger cup than our chart lists — take the largest one shown as a guide and check the brand's own chart.
                </p>
              )}
            </div>
          ) : (
            <p className="tool-note">Enter both measurements to see your size in every system.</p>
          )}

          <p className="tool-note">
            How this works: measure your under-bust snug around your ribcage and your bust around the fullest part, both level.
            Your <strong>band</strong> is the under-bust rounded to the nearest inch, plus 4 (or 5 if that's odd) — the standard
            method behind published size charts, which is why it lines up across countries. Your <strong>cup</strong> is the
            bust-minus-band difference: each inch is one cup (1″ = A, 2″ = B, 3″ = C…). Some fitters prefer a snugger band taken
            straight off the ribcage with no +4, which gives a smaller band and a bigger cup letter — if your band rides up or
            feels loose, try one band down and one cup up. Fit varies by brand and Asian labels often run a cup smaller, so treat
            this as a starting point. Nothing you type leaves your browser.
          </p>
        </>
      )}
    </div>
  );
}
