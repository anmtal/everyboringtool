"use client";

import { useState, useMemo } from "react";

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

// 2025 federal income tax brackets (taxable income after the standard deduction).
const BRACKETS = {
  single: [
    [0, 0.1],
    [11925, 0.12],
    [48475, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250525, 0.35],
    [626350, 0.37],
  ],
  married: [
    [0, 0.1],
    [23850, 0.12],
    [96950, 0.22],
    [206700, 0.24],
    [394600, 0.32],
    [501050, 0.35],
    [751600, 0.37],
  ],
  head: [
    [0, 0.1],
    [17000, 0.12],
    [64850, 0.22],
    [103350, 0.24],
    [197300, 0.32],
    [250500, 0.35],
    [626350, 0.37],
  ],
};

const STD_DEDUCTION = {
  single: 15000,
  married: 30000,
  head: 22500,
};

// Additional Medicare tax (0.9%) kicks in above these wage thresholds.
const ADDL_MEDICARE_THRESHOLD = {
  single: 200000,
  married: 250000,
  head: 200000,
};

const SS_WAGE_BASE = 176100; // 2025 Social Security wage base
const SS_RATE = 0.062;
const MEDICARE_RATE = 0.0145;
const ADDL_MEDICARE_RATE = 0.009;

const STATUSES = [
  { value: "single", label: "Single" },
  { value: "married", label: "Married filing jointly" },
  { value: "head", label: "Head of household" },
];

const FREQUENCIES = [
  { value: "annual", label: "Per year", periods: 1 },
  { value: "monthly", label: "Per month", periods: 12 },
  { value: "semimonthly", label: "Twice a month", periods: 24 },
  { value: "biweekly", label: "Every 2 weeks", periods: 26 },
  { value: "weekly", label: "Per week", periods: 52 },
];

function toNumber(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

// Progressive tax on a taxable income using the given bracket table.
function federalTax(taxable, brackets) {
  if (taxable <= 0) return 0;
  let tax = 0;
  for (let i = 0; i < brackets.length; i++) {
    const [floor, rate] = brackets[i];
    const ceil = i + 1 < brackets.length ? brackets[i + 1][0] : Infinity;
    if (taxable > floor) {
      tax += (Math.min(taxable, ceil) - floor) * rate;
    } else {
      break;
    }
  }
  return tax;
}

export default function TakeHomePayCalculator() {
  const [gross, setGross] = useState("75000");
  const [frequency, setFrequency] = useState("annual");
  const [status, setStatus] = useState("single");
  const [preTaxPct, setPreTaxPct] = useState("5");
  const [stateRate, setStateRate] = useState("5");
  const [postTaxPerPeriod, setPostTaxPerPeriod] = useState("0");

  const result = useMemo(() => {
    const rawGross = toNumber(gross);
    if (rawGross === null || rawGross < 0) return null;

    const freq = FREQUENCIES.find((f) => f.value === frequency) ?? FREQUENCIES[0];
    const periods = freq.periods;

    // Normalise the entered pay to an annual gross figure.
    const annualGross = rawGross * periods;

    const pre = toNumber(preTaxPct);
    const preFrac = pre === null || pre < 0 ? 0 : Math.min(pre, 100) / 100;
    const preTax = annualGross * preFrac; // 401(k)/pre-tax deductions

    // Pre-tax deductions reduce income for both federal and (approximately)
    // state income tax, but NOT for Social Security / Medicare (FICA).
    const fedWages = Math.max(0, annualGross - preTax);
    const taxable = Math.max(0, fedWages - STD_DEDUCTION[status]);

    const fed = federalTax(taxable, BRACKETS[status]);

    // FICA is on gross wages (401k is still subject to FICA).
    const ss = Math.min(annualGross, SS_WAGE_BASE) * SS_RATE;
    let medicare = annualGross * MEDICARE_RATE;
    const addlBase = Math.max(0, annualGross - ADDL_MEDICARE_THRESHOLD[status]);
    medicare += addlBase * ADDL_MEDICARE_RATE;

    const sRate = toNumber(stateRate);
    const sFrac = sRate === null || sRate < 0 ? 0 : sRate / 100;
    const state = fedWages * sFrac;

    const postPer = toNumber(postTaxPerPeriod);
    const postAnnual =
      postPer === null || postPer < 0 ? 0 : postPer * periods;

    const totalTax = fed + ss + medicare + state;
    const annualNet = annualGross - preTax - totalTax - postAnnual;
    const effectiveRate =
      annualGross > 0 ? (totalTax / annualGross) * 100 : 0;

    return {
      periods,
      annualGross,
      preTax,
      fed,
      ss,
      medicare,
      state,
      postAnnual,
      totalTax,
      annualNet,
      perNet: annualNet / periods,
      monthlyNet: annualNet / 12,
      effectiveRate,
    };
  }, [gross, frequency, status, preTaxPct, stateRate, postTaxPerPeriod]);

  const freqLabel = (
    FREQUENCIES.find((f) => f.value === frequency) ?? FREQUENCIES[0]
  ).label.toLowerCase();

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-gross">
              Gross pay ($)
            </label>
            <input
              className="tool-input"
              id="thp-gross"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={gross}
              onChange={(e) => setGross(e.target.value)}
              placeholder="e.g. 75000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-frequency">
              Pay frequency
            </label>
            <select
              className="tool-select"
              id="thp-frequency"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              {FREQUENCIES.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-status">
              Filing status
            </label>
            <select
              className="tool-select"
              id="thp-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-state">
              State income tax (%)
            </label>
            <input
              className="tool-input"
              id="thp-state"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.1"
              value={stateRate}
              onChange={(e) => setStateRate(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-pretax">
              401(k) / pre-tax (% of gross)
            </label>
            <input
              className="tool-input"
              id="thp-pretax"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.5"
              value={preTaxPct}
              onChange={(e) => setPreTaxPct(e.target.value)}
              placeholder="e.g. 5"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="thp-posttax">
              Other deductions (per paycheck $)
            </label>
            <input
              className="tool-input"
              id="thp-posttax"
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={postTaxPerPeriod}
              onChange={(e) => setPostTaxPerPeriod(e.target.value)}
              placeholder="e.g. 120"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              Estimated take-home pay ({freqLabel})
            </p>
            <div className="tool-result-value">{usd.format(result.perNet)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{usd0.format(result.annualNet)}</div>
              <div className="tool-stat-label">Net per year</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.monthlyNet)}
              </div>
              <div className="tool-stat-label">Net per month</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd0.format(result.annualGross)}
              </div>
              <div className="tool-stat-label">Gross per year</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.effectiveRate.toFixed(1)}%
              </div>
              <div className="tool-stat-label">Effective tax rate</div>
            </div>
          </div>

          <div className="tool-result" aria-live="polite">
            <p className="tool-result-label">Annual deductions breakdown</p>
            <div className="tool-stat-grid">
              <div className="tool-stat">
                <div className="tool-stat-num">{usd0.format(result.fed)}</div>
                <div className="tool-stat-label">Federal income tax</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{usd0.format(result.state)}</div>
                <div className="tool-stat-label">State income tax</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{usd0.format(result.ss)}</div>
                <div className="tool-stat-label">Social Security</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {usd0.format(result.medicare)}
                </div>
                <div className="tool-stat-label">Medicare</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">{usd0.format(result.preTax)}</div>
                <div className="tool-stat-label">Pre-tax (401k)</div>
              </div>
              <div className="tool-stat">
                <div className="tool-stat-num">
                  {usd0.format(result.postAnnual)}
                </div>
                <div className="tool-stat-label">Other deductions</div>
              </div>
            </div>
          </div>

          <p className="tool-note">
            Estimate uses 2025 federal brackets, the standard deduction for your
            filing status, Social Security (6.2% up to {usd0.format(SS_WAGE_BASE)}
            ), and Medicare (1.45% plus 0.9% above the high-earner threshold).
            State tax is applied as a flat rate you enter, so it will not match
            states with their own brackets or no income tax. This is a planning
            estimate, not tax advice, and excludes credits, itemized deductions,
            and local taxes.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your gross pay and choose a pay frequency to estimate your
          take-home pay after federal, state, and FICA taxes.
        </p>
      )}
    </div>
  );
}
