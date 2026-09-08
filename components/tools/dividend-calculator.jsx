"use client";

import { useState, useMemo } from "react";
import { copyText } from "../../lib/copyText";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd0 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
});

function pct(value) {
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 1,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

const FREQ = {
  annually: 1,
  "semi-annually": 2,
  quarterly: 4,
  monthly: 12,
};

export default function DividendCalculator() {
  const [price, setPrice] = useState("50");
  const [shares, setShares] = useState("200");
  const [divPerShare, setDivPerShare] = useState("2.00");
  const [frequency, setFrequency] = useState("quarterly");
  const [divGrowth, setDivGrowth] = useState("5");
  const [priceGrowth, setPriceGrowth] = useState("4");
  const [years, setYears] = useState("20");
  const [contribution, setContribution] = useState("100");
  const [reinvest, setReinvest] = useState(true);
  const [copied, setCopied] = useState(false);

  const result = useMemo(() => {
    const p0 = toNumber(price);
    const sh0 = toNumber(shares);
    const dps0 = toNumber(divPerShare); // annual dividend per share, year 1
    const dg = (toNumber(divGrowth) ?? 0) / 100;
    const pg = (toNumber(priceGrowth) ?? 0) / 100;
    const yrs = Math.round(toNumber(years) ?? 0);
    const monthlyContrib = toNumber(contribution) ?? 0;
    const perYear = FREQ[frequency] || 4;

    if (p0 === null || p0 <= 0) return null;
    if (sh0 === null || sh0 < 0) return null;
    if (dps0 === null || dps0 < 0) return null;
    if (yrs <= 0 || yrs > 100) return null;

    const startYield = (dps0 / p0) * 100;
    const startAnnualIncome = dps0 * sh0;

    let currentShares = sh0;
    let currentPrice = p0;
    let annualDps = dps0; // annual dividend/share for the current year
    let totalDividends = 0;
    let totalContributed = p0 * sh0;

    const rows = [];

    for (let y = 1; y <= yrs; y++) {
      // dividend per payment this year
      const dpsPerPayment = annualDps / perYear;
      let yearDividends = 0;

      // price is assumed to grow across the year; approximate with per-period price
      for (let period = 0; period < perYear; period++) {
        // add periodic contribution (spread monthly -> convert to this frequency)
        const contribThisPeriod = monthlyContrib * (12 / perYear);
        if (contribThisPeriod > 0 && currentPrice > 0) {
          currentShares += contribThisPeriod / currentPrice;
          totalContributed += contribThisPeriod;
        }

        // pay dividend on shares held
        const payment = dpsPerPayment * currentShares;
        yearDividends += payment;
        totalDividends += payment;

        if (reinvest && currentPrice > 0) {
          currentShares += payment / currentPrice;
        }

        // grow the price each period
        currentPrice *= Math.pow(1 + pg, 1 / perYear);
      }

      const portfolioValue = currentShares * currentPrice;
      const yieldOnCost =
        totalContributed > 0 ? (annualDps * currentShares / totalContributed) * 100 : 0;

      rows.push({
        year: y,
        shares: currentShares,
        price: currentPrice,
        annualDps,
        yearDividends,
        portfolioValue,
        yieldOnCost,
      });

      // grow the dividend per share for next year
      annualDps *= 1 + dg;
    }

    const final = rows[rows.length - 1];
    const finalValue = final.portfolioValue;
    const finalAnnualIncome = final.annualDps * final.shares;
    const capitalGain = finalValue - totalContributed;

    return {
      startYield,
      startAnnualIncome,
      totalDividends,
      totalContributed,
      finalValue,
      finalAnnualIncome,
      finalShares: final.shares,
      finalYieldOnCost: final.yieldOnCost,
      capitalGain,
      rows,
      reinvest,
    };
  }, [
    price,
    shares,
    divPerShare,
    frequency,
    divGrowth,
    priceGrowth,
    years,
    contribution,
    reinvest,
  ]);

  async function handleCopy() {
    if (!result) return;
    const lines = [
      "Year\tShares\tPrice\tDiv/Share\tYear Dividends\tPortfolio Value\tYield on Cost",
      ...result.rows.map((r) =>
        [
          r.year,
          r.shares.toFixed(2),
          r.price.toFixed(2),
          r.annualDps.toFixed(4),
          r.yearDividends.toFixed(2),
          r.portfolioValue.toFixed(2),
          r.yieldOnCost.toFixed(2) + "%",
        ].join("\t")
      ),
    ];
    try {
      await copyText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-price">
              Share price ($)
            </label>
            <input
              className="tool-input"
              id="dc-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="50.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-shares">
              Shares owned
            </label>
            <input
              className="tool-input"
              id="dc-shares"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={shares}
              onChange={(e) => setShares(e.target.value)}
              placeholder="200"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-dps">
              Annual dividend per share ($)
            </label>
            <input
              className="tool-input"
              id="dc-dps"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={divPerShare}
              onChange={(e) => setDivPerShare(e.target.value)}
              placeholder="2.00"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-freq">
              Payout frequency
            </label>
            <select
              className="tool-select"
              id="dc-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="annually">Annually</option>
              <option value="semi-annually">Semi-annually</option>
              <option value="quarterly">Quarterly</option>
              <option value="monthly">Monthly</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-divgrowth">
              Annual dividend growth (%)
            </label>
            <input
              className="tool-input"
              id="dc-divgrowth"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={divGrowth}
              onChange={(e) => setDivGrowth(e.target.value)}
              placeholder="5"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-pricegrowth">
              Annual share price growth (%)
            </label>
            <input
              className="tool-input"
              id="dc-pricegrowth"
              type="number"
              inputMode="decimal"
              step="0.1"
              value={priceGrowth}
              onChange={(e) => setPriceGrowth(e.target.value)}
              placeholder="4"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-years">
              Years to project
            </label>
            <input
              className="tool-input"
              id="dc-years"
              type="number"
              inputMode="numeric"
              min="1"
              max="100"
              step="1"
              value={years}
              onChange={(e) => setYears(e.target.value)}
              placeholder="20"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="dc-contribution">
              Monthly contribution ($)
            </label>
            <input
              className="tool-input"
              id="dc-contribution"
              type="number"
              inputMode="decimal"
              min="0"
              step="1"
              value={contribution}
              onChange={(e) => setContribution(e.target.value)}
              placeholder="100"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="dc-reinvest">
            Reinvest dividends (DRIP)
          </label>
          <select
            className="tool-select"
            id="dc-reinvest"
            value={reinvest ? "yes" : "no"}
            onChange={(e) => setReinvest(e.target.value === "yes")}
          >
            <option value="yes">Yes — reinvest into more shares</option>
            <option value="no">No — take dividends as cash</option>
          </select>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Annual dividend income in year {result.rows.length}
            </p>
            <div className="tool-result-value">
              {usd.format(result.finalAnnualIncome)}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd0.format(result.finalValue)}</div>
              <div className="tool-stat-label">Portfolio value</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.totalDividends)}
              </div>
              <div className="tool-stat-label">Total dividends paid</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.startYield)}</div>
              <div className="tool-stat-label">Starting yield</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.finalYieldOnCost)}</div>
              <div className="tool-stat-label">Yield on cost</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {new Intl.NumberFormat("en-US", {
                  maximumFractionDigits: 0,
                }).format(result.finalShares)}
              </div>
              <div className="tool-stat-label">Shares owned</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.totalContributed)}
              </div>
              <div className="tool-stat-label">Total invested</div>
            </div>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy year-by-year table"}
            </button>
          </div>

          <pre className="tool-output">
            {[
              "Yr    Shares      Price   Div/Sh  Dividends      Value",
              ...result.rows.map(
                (r) =>
                  `${String(r.year).padStart(2)}  ${r.shares
                    .toFixed(1)
                    .padStart(10)}  ${r.price
                    .toFixed(2)
                    .padStart(8)}  ${r.annualDps
                    .toFixed(3)
                    .padStart(6)}  ${r.yearDividends
                    .toFixed(0)
                    .padStart(9)}  ${r.portfolioValue.toFixed(0).padStart(9)}`
              ),
            ].join("\n")}
          </pre>

          <p className="tool-note">
            {result.reinvest
              ? "Dividends are reinvested into new shares at that year's price (DRIP), so share count compounds. "
              : "Dividends are taken as cash and not reinvested, so share count only grows from your contributions. "}
            This is a projection using constant growth rates you entered — real
            dividends, prices, and payout schedules vary, and figures are before
            taxes and fees. Nothing here is investment advice.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a share price, shares owned, and an annual dividend per share to
          project your dividend income.
        </p>
      )}
    </div>
  );
}
