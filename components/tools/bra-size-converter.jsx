"use client";

import { useState, useMemo } from "react";

// Band is deterministic (+2in = +5cm). Cups are indexed by the bust−band inch
// difference and each system emits its own letter for that index — this keeps
// above-D letters consistent instead of chaining letter-to-letter.
const BANDS = [
  { US: "26", UK: "26", EU: "55", FR: "70", AU: "4" },
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
  // Default to the measurement calculator: most searchers ("bra size calculator")
  // don't know their size yet. The "I know my size" converter is one tab away.
  const [mode, setMode] = useState("measure");
  // Which measurement method: "accurate" (6-point, ABraThatFits) or "quick" (2-point).
  const [mMethod, setMethod] = useState("accurate");
  const [unit, setUnit] = useState("in"); // shared by both measurement methods

  // ---- "I know my size" mode ----
  const [sys, setSys] = useState("US");
  const [band, setBand] = useState("34");
  const [cup, setCup] = useState("C");

  const bandOptions = BANDS.map((b) => b[sys]);
  const cupOptions = CUPS[sys];
  const safeBand = bandOptions.includes(band) ? band : bandOptions[4];
  const safeCup = cupOptions.includes(cup) ? cup : "C";

  const knownResult = useMemo(() => {
    const bandRow = BANDS.find((b) => b[sys] === safeBand);
    const cupIndex = CUPS[sys].indexOf(safeCup);
    if (!bandRow || cupIndex < 0) return null;
    return buildCards(bandRow, cupIndex);
  }, [sys, safeBand, safeCup]);

  // ---- Quick (2-measurement) method ----
  const [under, setUnder] = useState("");
  const [bust, setBust] = useState("");

  const measure = useMemo(() => {
    const u = parseFloat(under);
    const b = parseFloat(bust);
    if (!(u > 0) || !(b > 0)) return null;

    const toIn = (v) => (unit === "cm" ? v / CM_PER_IN : v);
    const toCm = (v) => (unit === "cm" ? v : v * CM_PER_IN);
    const underIn = toIn(u);
    const bustIn = toIn(b);
    const underCm = toCm(u);

    const usBand = clamp(Math.round(underIn / 2) * 2, 26, 48);
    const euBand = clamp(Math.round(underCm / 5) * 5, 55, 115);
    const bandByKey = {
      US: String(usBand),
      UK: String(usBand),
      EU: String(euBand),
      FR: String(euBand + 15),
      AU: String(usBand - 22),
    };

    const maxIdx = CUPS.US.length - 1;
    const rawDiff = Math.round(bustIn - underIn);
    const cupIndex = clamp(rawDiff, 0, maxIdx);

    const cards = SYSTEMS.map((s) => ({
      key: s.key,
      label: s.label,
      band: bandByKey[s.key],
      cup: CUPS[s.key][cupIndex] || "—",
    }));
    const us = cards.find((c) => c.key === "US");
    return {
      cards,
      usSize: `${us.band}${us.cup}`,
      warnSmallBust: rawDiff < 0,
      warnCup: rawDiff > maxIdx,
    };
  }, [unit, under, bust]);

  // ---- Most accurate (6-measurement, ABraThatFits) method ----
  // Band comes from the snug under-bust; the cup range comes from every bust
  // measurement you give (standing / leaning / lying), because full breast tissue
  // reads differently in each position. This is the r/ABraThatFits approach.
  const [ubLoose, setUbLoose] = useState("");
  const [ubSnug, setUbSnug] = useState("");
  const [ubTight, setUbTight] = useState("");
  const [bStand, setBStand] = useState("");
  const [bLean, setBLean] = useState("");
  const [bLie, setBLie] = useState("");

  const accurate = useMemo(() => {
    const toIn = (v) => {
      const n = parseFloat(v);
      if (!(n > 0)) return null;
      return unit === "cm" ? n / CM_PER_IN : n;
    };
    const snugIn = toIn(ubSnug);
    const tightIn = toIn(ubTight);
    const stand = toIn(bStand), lean = toIn(bLean), lie = toIn(bLie);
    const busts = [stand, lean, lie].filter((v) => v != null);
    if (snugIn == null || busts.length === 0) return null;

    const maxIdx = CUPS.US.length - 1;
    const bandIn = clamp(Math.round(snugIn / 2) * 2, 26, 44);
    const bandRow = BANDS.find((b) => Number(b.US) === bandIn) || BANDS[4];
    const bandIdx = BANDS.indexOf(bandRow);

    // Dynamic bust target (ABraThatFits): breast tissue reads differently by
    // position, so if the leaning bust runs >=2.5" over standing (softer, more
    // elastic tissue) trust the leaning measurement; otherwise take the full
    // range of what you measured. Cup = bust - band, one letter per inch.
    const softTissue = stand != null && lean != null && lean - stand >= 2.5;
    const bustLo = softTissue ? lean : Math.min(...busts);
    const bustHi = softTissue ? lean : Math.max(...busts);
    const loDiff = bustLo - bandIn;
    const hiDiff = bustHi - bandIn;
    const minIdx = clamp(Math.round(loDiff), 0, maxIdx);
    const maxCupIdx = clamp(Math.round(hiDiff), 0, maxIdx);
    const primaryIdx = clamp(Math.round((loDiff + hiDiff) / 2), 0, maxIdx);

    const fmt = (arr) => (minIdx === maxCupIdx ? arr[minIdx] : `${arr[minIdx]}/${arr[maxCupIdx]}`);
    const cards = SYSTEMS.map((s) => ({
      key: s.key,
      label: s.label,
      band: bandRow[s.key],
      cup: fmt(CUPS[s.key]) || "—",
    }));
    const uk = cards.find((c) => c.key === "UK");

    const sisterDown = bandIdx > 0
      ? `${BANDS[bandIdx - 1].US}${CUPS.US[clamp(primaryIdx + 1, 0, maxIdx)]}`
      : null; // smaller band, one cup up (same volume)
    const sisterUp = bandIdx < BANDS.length - 1
      ? `${BANDS[bandIdx + 1].US}${CUPS.US[clamp(primaryIdx - 1, 0, maxIdx)]}`
      : null; // larger band, one cup down

    return {
      cards,
      ukSize: `${uk.band}${uk.cup}`,
      isRange: minIdx !== maxCupIdx,
      softTissue,
      anyUnder: loDiff < 0,
      anyOverCup: hiDiff > maxIdx,
      sisterDown,
      sisterUp,
      bustCount: busts.length,
      tightHint: tightIn != null && Math.round(tightIn / 2) * 2 < bandIn
        ? String(clamp(Math.round(tightIn / 2) * 2, 26, 44))
        : null,
    };
  }, [unit, ubSnug, ubTight, bStand, bLean, bLie]);

  const numProps = {
    className: "tool-input",
    type: "number",
    inputMode: "decimal",
    min: "0",
    step: "0.1",
  };

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="How to enter your size" style={{ marginBottom: 16 }}>
        <button
          type="button" role="tab" aria-selected={mode === "measure"}
          className={`seg-btn ${mode === "measure" ? "is-active" : ""}`}
          onClick={() => setMode("measure")}
        >
          Calculate from measurements
        </button>
        <button
          type="button" role="tab" aria-selected={mode === "known"}
          className={`seg-btn ${mode === "known" ? "is-active" : ""}`}
          onClick={() => setMode("known")}
        >
          I know my size
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
          {mMethod === "accurate" && (
            <p style={{ margin: "0 0 10px", fontSize: 13, color: "#f87171" }}>
              In a hurry? Switch to{" "}
              <button
                type="button"
                onClick={() => setMethod("quick")}
                style={{ background: "none", border: "none", padding: 0, color: "#f87171", font: "inherit", fontWeight: 700, textDecoration: "underline", cursor: "pointer" }}
              >
                Quick estimate
              </button>{" "}
              — just two measurements (under-bust and bust).
            </p>
          )}
          <div className="seg-toggle" role="tablist" aria-label="Measurement method" style={{ marginBottom: 14 }}>
            <button
              type="button" role="tab" aria-selected={mMethod === "accurate"}
              className={`seg-btn ${mMethod === "accurate" ? "is-active" : ""}`}
              onClick={() => setMethod("accurate")}
            >
              Most accurate
            </button>
            <button
              type="button" role="tab" aria-selected={mMethod === "quick"}
              className={`seg-btn ${mMethod === "quick" ? "is-active" : ""}`}
              onClick={() => setMethod("quick")}
            >
              Quick estimate
            </button>
          </div>

          <div className="tool-field" style={{ marginBottom: 12 }}>
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

          {mMethod === "quick" ? (
            <>
              <div className="tool-fields">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="bra-under">Under-bust (ribcage)</label>
                  <input
                    {...numProps} id="bra-under" placeholder={unit === "cm" ? "e.g. 76" : "e.g. 30"}
                    value={under} onChange={(e) => setUnder(e.target.value)}
                  />
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor="bra-bust">Bust (fullest)</label>
                  <input
                    {...numProps} id="bra-bust" placeholder={unit === "cm" ? "e.g. 86" : "e.g. 34"}
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
                Quick method: measure your under-bust snug around your ribcage and your bust around the fullest part, both level.
                Your <strong>band</strong> is the ribcage rounded to the nearest even inch (or nearest 5&nbsp;cm) — the modern
                “snug band” method, no +4. Your <strong>cup</strong> is the bust-minus-ribcage difference (1″ = A, 2″ = B, 3″ = C…).
                For a truer fit, switch to <strong>Most accurate</strong>. Nothing you type leaves your browser.
              </p>
            </>
          ) : (
            <>
              <p className="tool-note" style={{ marginTop: 0 }}>
                The most accurate DIY method (used by r/ABraThatFits). Take a firm tape and measure to the nearest ¼&nbsp;inch or ½&nbsp;cm.
              </p>
              <div className="tool-fields">
                <div className="tool-field">
                  <span className="tool-label">Under-bust — around your ribcage, three ways</span>
                  <div className="tool-row">
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="ub-loose">Loose</label>
                      <input {...numProps} id="ub-loose" placeholder={unit === "cm" ? "74" : "29"} value={ubLoose} onChange={(e) => setUbLoose(e.target.value)} />
                    </div>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="ub-snug">Snug</label>
                      <input {...numProps} id="ub-snug" placeholder={unit === "cm" ? "71" : "28"} value={ubSnug} onChange={(e) => setUbSnug(e.target.value)} />
                    </div>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="ub-tight">Tight</label>
                      <input {...numProps} id="ub-tight" placeholder={unit === "cm" ? "66" : "26"} value={ubTight} onChange={(e) => setUbTight(e.target.value)} />
                    </div>
                  </div>
                </div>

                <div className="tool-field">
                  <span className="tool-label">Bust — around the fullest part, three positions</span>
                  <div className="tool-row">
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="b-stand">Standing</label>
                      <input {...numProps} id="b-stand" placeholder={unit === "cm" ? "86" : "34"} value={bStand} onChange={(e) => setBStand(e.target.value)} />
                    </div>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="b-lean">Leaning</label>
                      <input {...numProps} id="b-lean" placeholder={unit === "cm" ? "89" : "35"} value={bLean} onChange={(e) => setBLean(e.target.value)} />
                    </div>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor="b-lie">Lying</label>
                      <input {...numProps} id="b-lie" placeholder={unit === "cm" ? "86" : "34"} value={bLie} onChange={(e) => setBLie(e.target.value)} />
                    </div>
                  </div>
                </div>
              </div>

              {accurate ? (
                <div className="tool-result" role="status" aria-live="polite">
                  <p className="tool-result-label">Your best fit is around a UK {accurate.ukSize}</p>
                  <div className="csc-cards">
                    {accurate.cards.map((r) => (
                      <div key={r.key} className={`csc-card ${r.key === "UK" ? "is-input" : ""}`}>
                        <div className="csc-card-country">{r.label}</div>
                        <div className="csc-card-size">{r.band}{r.cup}</div>
                      </div>
                    ))}
                  </div>
                  {accurate.isRange && (
                    <p className="tool-note">
                      Your bust reads across two cups, so we've shown the range. Keep the band snug and, if you're between sizes,
                      size to the <strong>larger</strong> cup so it fully contains the tissue.
                    </p>
                  )}
                  {accurate.softTissue && (
                    <p className="tool-note">
                      Your leaning bust runs well over your standing bust — softer, more elastic tissue — so we sized to the
                      <strong> leaning</strong> measurement, which captures the full tissue a bra actually has to hold.
                    </p>
                  )}
                  {(accurate.sisterDown || accurate.sisterUp) && (
                    <p className="tool-note">
                      Sister sizes (same cup volume, different band) if the band feels off:{" "}
                      {accurate.sisterDown ? <>tighter band <strong>{accurate.sisterDown}</strong></> : null}
                      {accurate.sisterDown && accurate.sisterUp ? " · " : ""}
                      {accurate.sisterUp ? <>looser band <strong>{accurate.sisterUp}</strong></> : null} (US).
                    </p>
                  )}
                  {accurate.tightHint && (
                    <p className="tool-note">
                      Your tight measurement points to a firmer <strong>{accurate.tightHint}</strong> band — worth trying too if the {accurate.cards[0].band} rides up at the back.
                    </p>
                  )}
                  {accurate.anyUnder && (
                    <p className="tool-note">One bust measurement came out at or below your band — re-measure level, all the way round the fullest part.</p>
                  )}
                  {accurate.anyOverCup && (
                    <p className="tool-note">You're above the cups our chart lists — take the largest shown as a guide and check the brand's own size chart.</p>
                  )}
                </div>
              ) : (
                <p className="tool-note">
                  Enter at least your <strong>snug</strong> under-bust and one <strong>bust</strong> measurement. Add the leaning and
                  lying bust for the most accurate cup range.
                </p>
              )}

              <p className="tool-note">
                How it works: your <strong>band</strong> comes from the snug under-bust (rounded to the nearest even inch / 5&nbsp;cm) —
                the loose and tight readings just tell you how firm the band should be. Your <strong>cup</strong> is the bust minus
                the band; because breast tissue sits differently standing, leaning (bent forward 90°) and lying on your back, each
                position can give a different cup — so we show the range. UK cups go A, B, C, D, DD, E, F, FF, G… (no “DDD”). Fit
                varies by brand and Asian labels often run a cup smaller, so treat this as a strong starting point. Everything is
                worked out in your browser — nothing you type is sent anywhere.
              </p>
            </>
          )}
        </>
      )}
    </div>
  );
}
