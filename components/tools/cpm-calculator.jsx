"use client";

import { useMemo, useState } from "react";

const CURRENCIES = [
  { code: "USD", label: "USD ($)" },
  { code: "EUR", label: "EUR (€)" },
  { code: "GBP", label: "GBP (£)" },
  { code: "CAD", label: "CAD ($)" },
  { code: "AUD", label: "AUD ($)" },
  { code: "INR", label: "INR (₹)" },
  { code: "JPY", label: "JPY (¥)" },
  { code: "BRL", label: "BRL (R$)" },
];

function money(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  }
}

// Cost per single impression is a fraction of a cent, so it needs more decimals
// than money() shows ($2 CPM -> $0.002 per impression).
function moneyPrecise(value, currency) {
  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  } catch (e) {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 2,
      maximumFractionDigits: 6,
    }).format(value);
  }
}

const countFmt = new Intl.NumberFormat("en-US", {
  maximumFractionDigits: 0,
});

function pct(value) {
  return `${value.toLocaleString("en-US", { maximumFractionDigits: 2 })}%`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

function round2(n) {
  return Math.round(n * 100) / 100;
}

// Value written back into an input when the Solve-for mode changes. It keeps ten
// significant digits instead of rounding to cents, so switching modes and back
// doesn't drift the numbers the user typed ($500 / 213,220 impressions -> CPM
// 2.344995779 -> cost 500, not 498.93 as a 2.34 CPM would give).
function toInputValue(n) {
  return String(Number(n.toPrecision(10)));
}

// Round comparison values for the "What these numbers mean" tables. They are not
// benchmarks or averages for any platform.
const CPM_LADDER = [1, 2, 3, 5, 7, 10, 15, 20, 30, 50];
const CTR_LADDER = [0.25, 0.5, 1, 2, 3, 5];

// Ladder rows plus the user's own value. The user's row replaces a ladder row it
// matches (to 2 dp) rather than duplicating it, and keeps its exact value so the
// row agrees with the stat grid above.
function ladderRows(ladder, own) {
  const rows = ladder.map((v) => ({ v, own: false }));
  if (own == null || !Number.isFinite(own)) return rows;
  const key = round2(own);
  const out = rows.filter((r) => r.v !== key);
  out.push({ v: own, own: true });
  return out.sort((a, b) => a.v - b.v);
}

const SOLVE_LABELS = {
  cpm: "CPM (cost per 1,000 impressions)",
  cost: "Total cost",
  impressions: "Impressions",
};

export default function CpmCalculator({ initialSolveFor = "cpm" } = {}) {
  const [solveFor, setSolveFor] = useState(initialSolveFor);
  const [currency, setCurrency] = useState("USD");
  const [cost, setCost] = useState("500");
  const [impressions, setImpressions] = useState("250000");
  // Matches the default cost and impressions ($500 / 250,000 = $2.00), so the
  // calculator shows a result whichever mode it opens in.
  const [cpm, setCpm] = useState("2.00");
  const [clicks, setClicks] = useState("");
  const [conversions, setConversions] = useState("");
  const [reach, setReach] = useState("");
  const [tableView, setTableView] = useState("cpm");
  const [showCompare, setShowCompare] = useState(false);
  const [bCost, setBCost] = useState("");
  const [bImpressions, setBImpressions] = useState("");

  const result = useMemo(() => {
    const c = toNumber(cost);
    const imp = toNumber(impressions);
    const m = toNumber(cpm);

    if (solveFor === "cpm") {
      if (c === null || imp === null) return { status: "empty" };
      if (c < 0 || imp < 0) return { status: "negative" };
      if (imp === 0) return { status: "zero-impressions" };
      return { status: "ok", key: "cpm", value: (c / imp) * 1000, cost: c, impressions: imp };
    }

    if (solveFor === "cost") {
      if (m === null || imp === null) return { status: "empty" };
      if (m < 0 || imp < 0) return { status: "negative" };
      return { status: "ok", key: "cost", value: (m * imp) / 1000, cpm: m, impressions: imp };
    }

    // solveFor === "impressions"
    if (m === null || c === null) return { status: "empty" };
    if (m < 0 || c < 0) return { status: "negative" };
    if (m === 0) return { status: "zero-cpm" };
    return { status: "ok", key: "impressions", value: (c / m) * 1000, cost: c, cpm: m };
  }, [solveFor, cost, impressions, cpm]);

  // Resolved cost (C), impressions (I) and CPM (M), whichever one was solved for.
  const resolved = useMemo(() => {
    if (result.status !== "ok") return null;
    return {
      C: result.key === "cost" ? result.value : result.cost,
      I: result.key === "impressions" ? result.value : result.impressions,
      M: result.key === "cpm" ? result.value : result.cpm,
    };
  }, [result]);

  // Switching Solve-for keeps the value that was just calculated: it is written
  // into its own input, so the new mode starts with a result instead of a blank.
  function handleSolveForChange(next) {
    if (result.status === "ok") {
      if (result.key === "cpm") setCpm(toInputValue(result.value));
      else if (result.key === "cost") setCost(toInputValue(result.value));
      else if (result.key === "impressions") setImpressions(String(Math.round(result.value)));
    }
    setSolveFor(next);
  }

  // Optional extra ad metrics when clicks / conversions / reach are provided,
  // using the canonical cost + impressions resolved by the calculation above.
  const derived = useMemo(() => {
    if (!resolved) return null;
    const { C, I } = resolved;
    const clk = toNumber(clicks);
    const conv = toNumber(conversions);
    const rch = toNumber(reach);
    const out = {};
    if (clk != null && clk > 0) out.cpc = C / clk;
    // CTR only for 0 <= clicks <= impressions; more clicks than impressions
    // would be a CTR over 100%, so flag it instead.
    if (clk != null && clk > I) out.clicksError = true;
    else if (clk != null && clk >= 0 && I > 0) out.ctr = (clk / I) * 100;
    if (conv != null && conv > 0) out.cpa = C / conv;
    if (rch != null && rch > 0) {
      if (rch > I) {
        out.reachError = true;
      } else {
        out.frequency = I / rch;
        out.costPerReach = (C / rch) * 1000;
      }
    }
    return Object.keys(out).length ? out : null;
  }, [resolved, clicks, conversions, reach]);

  // "What these numbers mean": the same budget and impressions at round CPMs, and
  // the cost per click the CPM implies at a range of CTRs.
  const tables = useMemo(() => {
    if (!resolved) return null;
    const { C, I, M } = resolved;
    const scale = currency === "JPY" ? 100 : 1;
    const cpmRows = ladderRows(CPM_LADDER.map((v) => v * scale), M).map(({ v, own }) => ({
      own,
      cpm: v,
      perImpression: v / 1000,
      impressions: v > 0 && C > 0 ? Math.round((C / v) * 1000) : null,
      cost: I > 0 ? (v * I) / 1000 : null,
    }));
    const clk = toNumber(clicks);
    const actualCtr = clk != null && clk >= 0 && clk <= I && I > 0 ? (clk / I) * 100 : null;
    const ctrRows = ladderRows(CTR_LADDER, actualCtr).map(({ v, own }) => ({
      own,
      ctr: v,
      clicks: I > 0 ? Math.round((I * v) / 100) : null,
      cpc: v > 0 ? M / ((v / 100) * 1000) : null,
    }));
    return { cpmRows, ctrRows };
  }, [resolved, currency, clicks]);

  // Optional second buy, compared against the calculation above (Buy A).
  const compare = useMemo(() => {
    if (!resolved || !showCompare) return null;
    const bc = toNumber(bCost);
    const bi = toNumber(bImpressions);
    if (bc === null || bi === null) return { status: "empty" };
    if (bc < 0 || bi < 0) return { status: "negative" };
    if (bi === 0) return { status: "zero-impressions" };
    const mA = resolved.M;
    const mB = (bc / bi) * 1000;
    return {
      status: "ok",
      mA,
      mB,
      diff: mA > 0 ? ((mB - mA) / mA) * 100 : null,
      aAtB: mB > 0 ? (resolved.C / mB) * 1000 : null,
    };
  }, [resolved, showCompare, bCost, bImpressions]);

  function renderResultValue() {
    if (result.status !== "ok") return null;
    if (result.key === "cost") return money(result.value, currency);
    if (result.key === "cpm") return money(result.value, currency);
    return countFmt.format(Math.round(result.value));
  }

  function renderDiff(diff) {
    if (diff == null) return "—";
    if (Math.abs(diff) < 0.005) return "Same CPM";
    return `${pct(Math.abs(diff))} ${diff < 0 ? "lower" : "higher"}`;
  }

  const resultLabel =
    result.status === "ok"
      ? result.key === "cost"
        ? "Total campaign cost"
        : result.key === "cpm"
        ? "CPM (cost per 1,000 impressions)"
        : "Impressions delivered"
      : "";

  const showCost = solveFor !== "cost";
  const showImpressions = solveFor !== "impressions";
  const showCpm = solveFor !== "cpm";

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-solve">
              Solve for
            </label>
            <select
              className="tool-select"
              id="cpm-solve"
              value={solveFor}
              onChange={(e) => handleSolveForChange(e.target.value)}
            >
              <option value="cpm">CPM</option>
              <option value="cost">Cost</option>
              <option value="impressions">Impressions</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="cpm-currency"
              value={currency}
              onChange={(e) => setCurrency(e.target.value)}
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          {showCost ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-cost">
                Total cost
              </label>
              <input
                className="tool-input"
                id="cpm-cost"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                placeholder="500.00"
              />
            </div>
          ) : null}

          {showImpressions ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-impressions">
                Impressions
              </label>
              <input
                className="tool-input"
                id="cpm-impressions"
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={impressions}
                onChange={(e) => setImpressions(e.target.value)}
                placeholder="250000"
              />
            </div>
          ) : null}

          {showCpm ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpm-cpm">
                CPM
              </label>
              <input
                className="tool-input"
                id="cpm-cpm"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={cpm}
                onChange={(e) => setCpm(e.target.value)}
                placeholder="2.00"
              />
            </div>
          ) : null}
        </div>
      </div>

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-clicks">Clicks (optional — adds CPC &amp; CTR)</label>
            <input className="tool-input" id="cpm-clicks" type="number" inputMode="numeric" min="0" step="1" value={clicks} onChange={(e) => setClicks(e.target.value)} placeholder="e.g. 1250" />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-conv">Conversions (optional — adds CPA)</label>
            <input className="tool-input" id="cpm-conv" type="number" inputMode="numeric" min="0" step="1" value={conversions} onChange={(e) => setConversions(e.target.value)} placeholder="e.g. 40" />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpm-reach">Reach (optional — adds frequency)</label>
            <input className="tool-input" id="cpm-reach" type="number" inputMode="numeric" min="0" step="1" value={reach} onChange={(e) => setReach(e.target.value)} placeholder="e.g. 100000" />
          </div>
        </div>
      </div>

      {result.status === "ok" ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">{resultLabel}</p>
            <div className="tool-result-value">{renderResultValue()}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{money(resolved.C, currency)}</div>
              <div className="tool-stat-label">Total cost</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{countFmt.format(Math.round(resolved.I))}</div>
              <div className="tool-stat-label">Impressions</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{money(resolved.M, currency)}</div>
              <div className="tool-stat-label">CPM</div>
            </div>
            {resolved.I > 0 && (
              <div className="tool-stat">
                <div className="tool-stat-num">{moneyPrecise(resolved.C / resolved.I, currency)}</div>
                <div className="tool-stat-label">Cost per impression</div>
              </div>
            )}
          </div>

          {derived && (derived.cpc != null || derived.ctr != null || derived.cpa != null || derived.frequency != null) && (
            <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 10 }}>
              {derived.cpc != null && <div className="tool-stat"><div className="tool-stat-num">{money(derived.cpc, currency)}</div><div className="tool-stat-label">CPC (per click)</div></div>}
              {derived.ctr != null && <div className="tool-stat"><div className="tool-stat-num">{pct(derived.ctr)}</div><div className="tool-stat-label">CTR</div></div>}
              {derived.cpa != null && <div className="tool-stat"><div className="tool-stat-num">{money(derived.cpa, currency)}</div><div className="tool-stat-label">CPA (per conversion)</div></div>}
              {derived.frequency != null && <div className="tool-stat"><div className="tool-stat-num">{derived.frequency.toLocaleString("en-US", { maximumFractionDigits: 2 })}</div><div className="tool-stat-label">Frequency (impressions per person)</div></div>}
              {derived.costPerReach != null && <div className="tool-stat"><div className="tool-stat-num">{money(derived.costPerReach, currency)}</div><div className="tool-stat-label">Cost per 1,000 people reached</div></div>}
            </div>
          )}
          {derived && derived.clicksError && (
            <p className="tool-error">Clicks are higher than impressions, which would be a CTR over 100% — check that both figures come from the same report.</p>
          )}
          {derived && derived.reachError && (
            <p className="tool-error">Reach can&apos;t be higher than impressions — everyone reached saw the ad at least once.</p>
          )}
          <p className="tool-note">
            CPM is the cost per 1,000 impressions (eCPM is the same math on ad revenue). CPM = cost ÷ impressions ×
            1,000; cost = CPM × impressions ÷ 1,000; impressions = cost ÷ CPM ×
            1,000; cost per impression = cost ÷ impressions (CPM ÷ 1,000). Pick what to solve for and fill in the other two values.
          </p>

          <div>
            <h2 className="tool-h2">What these numbers mean</h2>
            <div className="seg-toggle" role="tablist" aria-label="Comparison table">
              <button
                type="button"
                role="tab"
                aria-selected={tableView === "cpm"}
                className={`seg-btn ${tableView === "cpm" ? "is-active" : ""}`}
                onClick={() => setTableView("cpm")}
              >
                Budget at other CPMs
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={tableView === "ctr"}
                className={`seg-btn ${tableView === "ctr" ? "is-active" : ""}`}
                onClick={() => setTableView("ctr")}
              >
                Cost per click at other CTRs
              </button>
            </div>

            {tableView === "cpm" ? (
              <>
                <div className="csc-table-wrap" role="tabpanel" style={{ marginTop: 12 }}>
                  <table className="csc-table">
                    <thead>
                      <tr>
                        <th scope="col">CPM</th>
                        <th scope="col">Cost per impression</th>
                        <th scope="col">Impressions for {money(resolved.C, currency)}</th>
                        <th scope="col">Cost of {countFmt.format(Math.round(resolved.I))} impressions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.cpmRows.map((r, i) => (
                        <tr key={i} className={r.own ? "is-match" : undefined}>
                          <td>{money(r.cpm, currency)}{r.own ? " (yours)" : ""}</td>
                          <td>{moneyPrecise(r.perImpression, currency)}</td>
                          <td>{r.impressions != null ? countFmt.format(r.impressions) : "—"}</td>
                          <td>{r.cost != null ? money(r.cost, currency) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="tool-note" style={{ marginTop: 8 }}>
                  Round CPM values for comparison — not benchmarks for any platform.
                </p>
              </>
            ) : (
              <>
                <div className="csc-table-wrap" role="tabpanel" style={{ marginTop: 12 }}>
                  <table className="csc-table">
                    <thead>
                      <tr>
                        <th scope="col">CTR</th>
                        <th scope="col">Clicks from {countFmt.format(Math.round(resolved.I))} impressions</th>
                        <th scope="col">Cost per click</th>
                      </tr>
                    </thead>
                    <tbody>
                      {tables.ctrRows.map((r, i) => (
                        <tr key={i} className={r.own ? "is-match" : undefined}>
                          <td>{pct(r.ctr)}{r.own ? " (yours)" : ""}</td>
                          <td>{r.clicks != null ? countFmt.format(r.clicks) : "—"}</td>
                          <td>{r.cpc != null ? money(r.cpc, currency) : "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                <p className="tool-note" style={{ marginTop: 8 }}>
                  CPC = CPM ÷ (CTR × 1,000), with CTR as a decimal (1% = 0.01). Example CTRs, not platform averages.
                </p>
              </>
            )}
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn"
              aria-expanded={showCompare}
              aria-controls="cpm-compare"
              onClick={() => setShowCompare((v) => !v)}
            >
              {showCompare ? "Hide comparison" : "Compare another buy"}
            </button>
          </div>

          {showCompare && (
            <div className="tool-fields" id="cpm-compare">
              <div className="tool-row">
                <div className="tool-field">
                  <label className="tool-label" htmlFor="cpm-b-cost">Buy B cost</label>
                  <input className="tool-input" id="cpm-b-cost" type="number" inputMode="decimal" min="0" step="0.01" value={bCost} onChange={(e) => setBCost(e.target.value)} placeholder="600.00" />
                </div>
                <div className="tool-field">
                  <label className="tool-label" htmlFor="cpm-b-impressions">Buy B impressions</label>
                  <input className="tool-input" id="cpm-b-impressions" type="number" inputMode="numeric" min="0" step="1" value={bImpressions} onChange={(e) => setBImpressions(e.target.value)} placeholder="400000" />
                </div>
              </div>
              {compare && compare.status === "ok" ? (
                <div className="tool-stat-grid" role="status" aria-live="polite">
                  <div className="tool-stat">
                    <div className="tool-stat-num">{money(compare.mA, currency)}</div>
                    <div className="tool-stat-label">Buy A CPM (above)</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">{money(compare.mB, currency)}</div>
                    <div className="tool-stat-label">Buy B CPM</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">{renderDiff(compare.diff)}</div>
                    <div className="tool-stat-label">Buy B&apos;s CPM vs Buy A</div>
                  </div>
                  <div className="tool-stat">
                    <div className="tool-stat-num">{compare.aAtB != null ? countFmt.format(Math.round(compare.aAtB)) : "—"}</div>
                    <div className="tool-stat-label">Impressions Buy A&apos;s {money(resolved.C, currency)} buys at Buy B&apos;s CPM</div>
                  </div>
                </div>
              ) : (
                <p className={compare && compare.status !== "empty" ? "tool-error" : "tool-note"}>
                  {!compare || compare.status === "empty"
                    ? "Enter Buy B's cost and impressions to compare its CPM with the buy above."
                    : compare.status === "negative"
                    ? "Buy B's cost and impressions can't be negative."
                    : "Buy B's impressions must be greater than zero to work out its CPM."}
                </p>
              )}
            </div>
          )}
        </>
      ) : (
        <p
          className={
            result.status === "empty" ? "tool-note" : "tool-error"
          }
        >
          {result.status === "empty"
            ? `Enter the two known values to calculate ${SOLVE_LABELS[solveFor]}.`
            : result.status === "negative"
            ? "Values can't be negative — enter positive numbers for cost, impressions, and CPM."
            : result.status === "zero-impressions"
            ? "Impressions must be greater than zero to calculate CPM (you can't divide by zero impressions)."
            : "CPM must be greater than zero to calculate impressions (you can't divide by a zero CPM)."}
        </p>
      )}
    </div>
  );
}
