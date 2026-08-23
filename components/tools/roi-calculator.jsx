"use client";

import { useMemo, useState } from "react";

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

const currency = new Intl.NumberFormat(undefined, {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function formatMoney(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  return currency.format(n);
}

function formatPercent(n) {
  if (n === null || n === undefined || !Number.isFinite(n)) return "—";
  const rounded = Number(n.toFixed(2));
  return `${rounded.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })}%`;
}

export default function RoiCalculator() {
  const [invested, setInvested] = useState("");
  const [returned, setReturned] = useState("");
  const [years, setYears] = useState("");

  const results = useMemo(() => {
    const inv = toNumber(invested);
    const ret = toNumber(returned);
    const yrs = toNumber(years);

    if (inv === null && ret === null) return null;
    if (inv === null || ret === null) return { incomplete: true };

    // Divide-by-zero guard: ROI is undefined without a positive amount invested.
    if (inv <= 0) return { zeroInvested: true };

    const profit = ret - inv;
    const roi = (profit / inv) * 100;

    // Annualized ROI (CAGR). Only defined when a positive holding period is
    // given and the ending value is positive.
    let annualized = null;
    let annualizedNote = null;
    if (yrs !== null) {
      if (yrs <= 0) {
        annualizedNote = "zeroYears";
      } else if (ret <= 0) {
        annualizedNote = "negativeReturn";
      } else {
        annualized = (Math.pow(ret / inv, 1 / yrs) - 1) * 100;
      }
    }

    return {
      invested: inv,
      returned: ret,
      years: yrs,
      profit,
      roi,
      annualized,
      annualizedNote,
    };
  }, [invested, returned, years]);

  const ready = results && !results.incomplete && !results.zeroInvested;
  const showAnnualized =
    ready && results.years !== null && results.years > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="roi-invested">
              Amount invested
            </label>
            <input
              className="tool-input"
              id="roi-invested"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 1000"
              value={invested}
              onChange={(e) => setInvested(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="roi-returned">
              Amount returned
            </label>
            <input
              className="tool-input"
              id="roi-returned"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 1500"
              value={returned}
              onChange={(e) => setReturned(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="roi-years">
              Holding period (years, optional)
            </label>
            <input
              className="tool-input"
              id="roi-years"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 3"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>
        </div>

        {ready ? (
          <>
            <div className="tool-result">
              <span className="tool-result-label">Return on investment</span>
              <span className="tool-result-value">
                {formatPercent(results.roi)}
              </span>
            </div>

            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{formatPercent(results.roi)}</div>
                <div className="tool-stat-label">ROI</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.profit)}
                </div>
                <div className="tool-stat-label">
                  {results.profit < 0 ? "Net loss" : "Net profit"}
                </div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {formatMoney(results.returned)}
                </div>
                <div className="tool-stat-label">Total returned</div>
              </div>
              {showAnnualized && (
                <div className="tool-stat">
                  <div className="tool-stat-num">
                    {formatPercent(results.annualized)}
                  </div>
                  <div className="tool-stat-label">Annualized ROI</div>
                </div>
              )}
            </div>
          </>
        ) : (
          <p className="tool-note">
            Enter the amount invested and the amount returned to see your ROI,
            net profit, and (with a holding period) the annualized return.
          </p>
        )}

        {results && results.zeroInvested && (
          <p className="tool-error">
            The amount invested must be greater than zero to calculate ROI.
          </p>
        )}

        {ready &&
          results.annualizedNote === "zeroYears" && (
            <p className="tool-note">
              Annualized ROI needs a holding period above zero years, so it is
              hidden here.
            </p>
          )}
        {ready &&
          results.annualizedNote === "negativeReturn" && (
            <p className="tool-note">
              Annualized ROI can only be shown when the amount returned is above
              zero.
            </p>
          )}

        <p className="tool-note">
          ROI = (returned − invested) ÷ invested × 100. Annualized ROI is the
          equivalent compound yearly rate over the holding period. Everything is
          calculated in your browser — nothing is uploaded.
        </p>
      </div>
    </div>
  );
}
