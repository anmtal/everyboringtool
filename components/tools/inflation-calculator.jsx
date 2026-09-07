"use client";

import { useMemo, useState } from "react";

const usd = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", minimumFractionDigits: 2, maximumFractionDigits: 2 });
const pct = (n, d = 1) => (n >= 0 ? "+" : "") + n.toLocaleString("en-US", { minimumFractionDigits: d, maximumFractionDigits: d }) + "%";
const num = (v) => { const n = parseFloat(v); return Number.isFinite(n) ? n : null; };

export default function InflationCalculator({ initialMode = "buying", initialBeforeLabel = "Old amount ($)", initialAfterLabel = "New amount ($)" } = {}) {
  const [mode, setMode] = useState(initialMode); // buying | beat

  // Buying-power mode
  const [amount, setAmount] = useState("100");
  const [startYear, setStartYear] = useState("2000");
  const [endYear, setEndYear] = useState("2025");
  const [rate, setRate] = useState("3");

  // Beat-inflation mode
  const [before, setBefore] = useState("50000");
  const [after, setAfter] = useState("52000");
  const [years, setYears] = useState("1");
  const [brate, setBrate] = useState("3.2");

  const buying = useMemo(() => {
    const P = num(amount), y1 = num(startYear), y2 = num(endYear), r = num(rate);
    if (P === null || y1 === null || y2 === null || r === null || P < 0 || r <= -100) return null;
    const yrs = y2 - y1, mult = Math.pow(1 + r / 100, yrs);
    if (!Number.isFinite(mult)) return null;
    return { equivalent: P * mult, mult, totalChange: (mult - 1) * 100, years: yrs, forward: yrs >= 0, y1, y2, P };
  }, [amount, startYear, endYear, rate]);

  const beat = useMemo(() => {
    const b = num(before), a = num(after), y = num(years), r = num(brate);
    if (b === null || a === null || y === null || r === null || b <= 0 || r <= -100 || y < 0) return null;
    const inflMult = Math.pow(1 + r / 100, y);
    const keepPace = b * inflMult;
    const nominal = (a / b - 1) * 100;
    const inflation = (inflMult - 1) * 100;
    const realMult = (a / b) / inflMult;
    const real = (realMult - 1) * 100;
    return { nominal, inflation, real, keepPace, beats: real > 0.05, behind: real < -0.05 };
  }, [before, after, years, brate]);

  return (
    <div className="tool">
      <div className="seg-toggle" role="tablist" aria-label="Mode" style={{ marginBottom: 14 }}>
        <button type="button" role="tab" aria-selected={mode === "buying"} className={`seg-btn ${mode === "buying" ? "is-active" : ""}`} onClick={() => setMode("buying")}>Buying power</button>
        <button type="button" role="tab" aria-selected={mode === "beat"} className={`seg-btn ${mode === "beat" ? "is-active" : ""}`} onClick={() => setMode("beat")}>Did it beat inflation?</button>
      </div>

      {mode === "buying" ? (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="inf-amount">Amount ($)</label>
              <input className="tool-input" id="inf-amount" type="number" inputMode="decimal" min="0" step="any" placeholder="100" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div className="tool-row">
              <div className="tool-field"><label className="tool-label" htmlFor="inf-start">Start year</label><input className="tool-input" id="inf-start" type="number" step="1" placeholder="2000" value={startYear} onChange={(e) => setStartYear(e.target.value)} /></div>
              <div className="tool-field"><label className="tool-label" htmlFor="inf-end">End year</label><input className="tool-input" id="inf-end" type="number" step="1" placeholder="2025" value={endYear} onChange={(e) => setEndYear(e.target.value)} /></div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="inf-rate">Average annual inflation rate (%)</label>
              <input className="tool-input" id="inf-rate" type="number" inputMode="decimal" step="any" placeholder="3" value={rate} onChange={(e) => setRate(e.target.value)} />
            </div>
          </div>
          {buying ? (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">EQUIVALENT VALUE IN {buying.y2}</p>
                <div className="tool-result-value">{usd.format(buying.equivalent)}</div>
              </div>
              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat"><div className="tool-stat-num">{pct(buying.totalChange)}</div><div className="tool-stat-label">Total price change</div></div>
                <div className="tool-stat"><div className="tool-stat-num">{buying.mult.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}&times;</div><div className="tool-stat-label">Cumulative multiplier</div></div>
                <div className="tool-stat"><div className="tool-stat-num">{Math.abs(buying.years)}</div><div className="tool-stat-label">{Math.abs(buying.years) === 1 ? "year" : "years"} spanned</div></div>
              </div>
              <p className="tool-note">
                {buying.years === 0 ? "The start and end years are the same, so buying power is unchanged."
                  : buying.forward ? `${usd.format(buying.P)} in ${buying.y1} has the same buying power as ${usd.format(buying.equivalent)} in ${buying.y2}, assuming ${rate}% average annual inflation.`
                    : `${usd.format(buying.P)} in ${buying.y1} was worth about ${usd.format(buying.equivalent)} in ${buying.y2} — earlier dollars had more buying power, at ${rate}% average annual inflation.`}
              </p>
            </>
          ) : <p className="tool-note">Enter an amount, a start and end year, and an average inflation rate to see the equivalent buying power.</p>}
        </>
      ) : (
        <>
          <p className="tool-note" style={{ marginTop: 0 }}>Compare a before-and-after amount against inflation to see whether it gained or lost real value.</p>
          <div className="tool-row">
            <div className="tool-field"><label className="tool-label" htmlFor="b-before">{initialBeforeLabel}</label><input className="tool-input" id="b-before" type="number" inputMode="decimal" min="0" step="any" value={before} onChange={(e) => setBefore(e.target.value)} /></div>
            <div className="tool-field"><label className="tool-label" htmlFor="b-after">{initialAfterLabel}</label><input className="tool-input" id="b-after" type="number" inputMode="decimal" min="0" step="any" value={after} onChange={(e) => setAfter(e.target.value)} /></div>
          </div>
          <div className="tool-row">
            <div className="tool-field"><label className="tool-label" htmlFor="b-years">Over how many years?</label><input className="tool-input" id="b-years" type="number" inputMode="decimal" min="0" step="any" value={years} onChange={(e) => setYears(e.target.value)} /></div>
            <div className="tool-field"><label className="tool-label" htmlFor="b-rate">Inflation rate (% per year)</label><input className="tool-input" id="b-rate" type="number" inputMode="decimal" step="any" value={brate} onChange={(e) => setBrate(e.target.value)} /></div>
          </div>
          {beat ? (
            <>
              <div className="tool-result" role="status" aria-live="polite">
                <p className="tool-result-label">REAL CHANGE (AFTER INFLATION)</p>
                <div className="tool-result-value" style={{ color: beat.beats ? "var(--good, #0e7c6b)" : beat.behind ? "var(--danger, #b4462d)" : undefined }}>{pct(beat.real)}</div>
              </div>
              <div className="tool-stat-grid" role="status" aria-live="polite">
                <div className="tool-stat"><div className="tool-stat-num">{pct(beat.nominal)}</div><div className="tool-stat-label">Nominal change</div></div>
                <div className="tool-stat"><div className="tool-stat-num">{pct(beat.inflation)}</div><div className="tool-stat-label">Inflation over period</div></div>
                <div className="tool-stat"><div className="tool-stat-num">{usd.format(beat.keepPace)}</div><div className="tool-stat-label">Needed to keep pace</div></div>
              </div>
              <p className="tool-note">
                {beat.beats ? `This beat inflation — after adjusting for rising prices it's worth about ${pct(beat.real)} more in real terms. To merely keep pace it only had to reach ${usd.format(beat.keepPace)}.`
                  : beat.behind ? `This fell behind inflation — in real terms it's worth about ${pct(beat.real).replace("+", "")} less buying power. It needed to reach ${usd.format(beat.keepPace)} just to keep pace.`
                    : `This roughly kept pace with inflation — the real change is close to zero, so buying power is about the same.`}
              </p>
            </>
          ) : <p className="tool-note">Enter a before and after amount, the number of years, and an inflation rate to see whether it beat inflation.</p>}
        </>
      )}
    </div>
  );
}
