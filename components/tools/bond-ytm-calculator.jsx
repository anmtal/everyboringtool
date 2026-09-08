"use client";

import { useMemo, useState } from "react";

// Present value of a bond's cash flows given a periodic yield.
function bondPrice(face, couponPerPeriod, periods, periodicYield) {
  if (periodicYield === 0) {
    return couponPerPeriod * periods + face;
  }
  const discount = Math.pow(1 + periodicYield, -periods);
  const annuity = (1 - discount) / periodicYield;
  return couponPerPeriod * annuity + face * discount;
}

// Solve for periodic yield by bisection so it converges on any valid bond.
function solvePeriodicYield(face, couponPerPeriod, periods, price) {
  let low = -0.9999; // just above -100% per period
  let high = 10; // 1000% per period, well beyond any real bond

  const priceAt = (y) => bondPrice(face, couponPerPeriod, periods, y) - price;

  let fLow = priceAt(low);
  let fHigh = priceAt(high);

  // Price decreases as yield rises, so we need opposite signs to bracket.
  if (fLow === 0) return low;
  if (fHigh === 0) return high;
  if (fLow * fHigh > 0) return null;

  for (let i = 0; i < 200; i++) {
    const mid = (low + high) / 2;
    const fMid = priceAt(mid);
    if (Math.abs(fMid) < 1e-9 || (high - low) / 2 < 1e-12) {
      return mid;
    }
    if (fLow * fMid < 0) {
      high = mid;
      fHigh = fMid;
    } else {
      low = mid;
      fLow = fMid;
    }
  }
  return (low + high) / 2;
}

export default function BondYtmCalculator() {
  const [face, setFace] = useState("1000");
  const [price, setPrice] = useState("960");
  const [couponRate, setCouponRate] = useState("5");
  const [years, setYears] = useState("10");
  const [frequency, setFrequency] = useState("2");

  const currency = useMemo(
    () =>
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: "USD",
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    []
  );

  const results = useMemo(() => {
    const F = parseFloat(face);
    const P = parseFloat(price);
    const c = parseFloat(couponRate);
    const t = parseFloat(years);
    const freq = parseInt(frequency, 10);

    if (
      !Number.isFinite(F) ||
      !Number.isFinite(P) ||
      !Number.isFinite(c) ||
      !Number.isFinite(t) ||
      !Number.isFinite(freq) ||
      F <= 0 ||
      P <= 0 ||
      t <= 0 ||
      c < 0 ||
      freq <= 0
    ) {
      return null;
    }

    const periods = t * freq;
    if (periods <= 0) return null;

    const annualCoupon = (F * c) / 100;
    const couponPerPeriod = annualCoupon / freq;

    const periodicYield = solvePeriodicYield(F, couponPerPeriod, periods, P);
    if (periodicYield === null || !Number.isFinite(periodicYield)) {
      return null;
    }

    // Nominal annual YTM (bond-equivalent), the number most tools report.
    const nominalYtm = periodicYield * freq;
    // Effective annual yield compounds the periodic yield across the year.
    const effectiveYtm = Math.pow(1 + periodicYield, freq) - 1;
    // Current yield ignores capital gain/loss, just income over price.
    const currentYield = annualCoupon / P;

    return {
      nominalYtm: nominalYtm * 100,
      effectiveYtm: effectiveYtm * 100,
      currentYield: currentYield * 100,
      annualCoupon,
      couponPerPeriod,
      periods,
      premium: P > F,
      discount: P < F,
    };
  }, [face, price, couponRate, years, frequency]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bond-face">
              Face (par) value ($)
            </label>
            <input
              className="tool-input"
              id="bond-face"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="1000"
              value={face}
              onChange={(e) => setFace(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bond-price">
              Current price ($)
            </label>
            <input
              className="tool-input"
              id="bond-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="960"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="bond-coupon">
              Annual coupon rate (%)
            </label>
            <input
              className="tool-input"
              id="bond-coupon"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="5"
              value={couponRate}
              onChange={(e) => setCouponRate(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bond-years">
              Years to maturity
            </label>
            <input
              className="tool-input"
              id="bond-years"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="10"
              value={years}
              onChange={(e) => setYears(e.target.value)}
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="bond-freq">
              Coupons per year
            </label>
            <select
              className="tool-select"
              id="bond-freq"
              value={frequency}
              onChange={(e) => setFrequency(e.target.value)}
            >
              <option value="1">Annual (1)</option>
              <option value="2">Semi-annual (2)</option>
              <option value="4">Quarterly (4)</option>
              <option value="12">Monthly (12)</option>
            </select>
          </div>
        </div>
      </div>

      {results ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">YIELD TO MATURITY (ANNUAL)</p>
            <div className="tool-result-value">
              {results.nominalYtm.toFixed(3)}%
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.effectiveYtm.toFixed(3)}%
              </div>
              <div className="tool-stat-label">Effective annual yield</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.currentYield.toFixed(3)}%
              </div>
              <div className="tool-stat-label">Current yield</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.annualCoupon)}
              </div>
              <div className="tool-stat-label">Annual coupon income</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {currency.format(results.couponPerPeriod)}
              </div>
              <div className="tool-stat-label">Coupon per period</div>
            </div>
          </div>

          <p className="tool-note">
            This bond is trading at a{" "}
            {results.premium
              ? "premium (price above par), so its YTM is below the coupon rate"
              : results.discount
              ? "discount (price below par), so its YTM is above the coupon rate"
              : "par (price equals face value), so its YTM equals the coupon rate"}
            . YTM assumes you hold to maturity and reinvest every coupon at the
            same yield.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter the bond&apos;s face value, current price, coupon rate, years to
          maturity, and payment frequency to estimate its yield to maturity.
        </p>
      )}
    </div>
  );
}
