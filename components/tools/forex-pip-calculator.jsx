"use client";

import { useMemo, useState } from "react";

const LOT_SIZES = [
  { key: "standard", label: "Standard lot (100,000)", units: 100000 },
  { key: "mini", label: "Mini lot (10,000)", units: 10000 },
  { key: "micro", label: "Micro lot (1,000)", units: 1000 },
  { key: "nano", label: "Nano lot (100)", units: 100 },
  { key: "units", label: "Custom units", units: 1 },
];

export default function ForexPipCalculator() {
  const [base, setBase] = useState("EUR");
  const [quote, setQuote] = useState("USD");
  const [account, setAccount] = useState("USD");
  const [lotType, setLotType] = useState("standard");
  const [quantity, setQuantity] = useState("1");
  const [price, setPrice] = useState("1.1000");
  const [convRate, setConvRate] = useState("");

  const cleanBase = base.trim().toUpperCase();
  const cleanQuote = quote.trim().toUpperCase();
  const cleanAccount = account.trim().toUpperCase();

  const results = useMemo(() => {
    if (cleanBase.length !== 3 || cleanQuote.length !== 3 || cleanAccount.length !== 3) {
      return null;
    }
    if (cleanBase === cleanQuote) return null;

    const lot = LOT_SIZES.find((l) => l.key === lotType) || LOT_SIZES[0];
    const qty = parseFloat(quantity);
    const p = parseFloat(price);

    if (!Number.isFinite(qty) || qty <= 0) return null;
    if (!Number.isFinite(p) || p <= 0) return null;

    // JPY-quoted pairs (and a few others) use 0.01 as one pip; everything else 0.0001.
    const pipSize = cleanQuote === "JPY" ? 0.01 : 0.0001;
    const units = lot.units * qty;

    // Pip value expressed in the QUOTE currency.
    const pipValueQuote = pipSize * units;

    // Convert to the account currency.
    let pipValueAccount = null;
    let conversionUsed = "";

    if (cleanAccount === cleanQuote) {
      pipValueAccount = pipValueQuote;
      conversionUsed = "quote";
    } else if (cleanAccount === cleanBase) {
      // Divide by the pair price to move from quote into base currency.
      pipValueAccount = pipValueQuote / p;
      conversionUsed = "base";
    } else {
      const cr = parseFloat(convRate);
      if (Number.isFinite(cr) && cr > 0) {
        // convRate = how many account-currency units per 1 quote-currency unit.
        pipValueAccount = pipValueQuote * cr;
        conversionUsed = "custom";
      } else {
        conversionUsed = "needsRate";
      }
    }

    return {
      pipSize,
      units,
      pipValueQuote,
      pipValueAccount,
      conversionUsed,
    };
  }, [cleanBase, cleanQuote, cleanAccount, lotType, quantity, price, convRate]);

  const needsCustomRate =
    results &&
    cleanAccount !== cleanQuote &&
    cleanAccount !== cleanBase;

  const fmt = (n, ccy) => {
    if (!Number.isFinite(n)) return "—";
    try {
      return new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: ccy,
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      }).format(n);
    } catch {
      // Fall back for non-standard 3-letter codes Intl doesn't recognise.
      return `${n.toLocaleString("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4,
      })} ${ccy}`;
    }
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-base">
              Base currency
            </label>
            <input
              className="tool-input"
              id="pip-base"
              type="text"
              maxLength={3}
              placeholder="EUR"
              value={base}
              onChange={(e) => setBase(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-quote">
              Quote currency
            </label>
            <input
              className="tool-input"
              id="pip-quote"
              type="text"
              maxLength={3}
              placeholder="USD"
              value={quote}
              onChange={(e) => setQuote(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-account">
              Account currency
            </label>
            <input
              className="tool-input"
              id="pip-account"
              type="text"
              maxLength={3}
              placeholder="USD"
              value={account}
              onChange={(e) => setAccount(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-lot">
              Position size
            </label>
            <select
              className="tool-select"
              id="pip-lot"
              value={lotType}
              onChange={(e) => setLotType(e.target.value)}
            >
              {LOT_SIZES.map((l) => (
                <option key={l.key} value={l.key}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-qty">
              {lotType === "units" ? "Number of units" : "Number of lots"}
            </label>
            <input
              className="tool-input"
              id="pip-qty"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="1"
              value={quantity}
              onChange={(e) => setQuantity(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-price">
              Pair price ({cleanBase || "BASE"}/{cleanQuote || "QUOTE"})
            </label>
            <input
              className="tool-input"
              id="pip-price"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="1.1000"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
            />
          </div>
        </div>

        {needsCustomRate ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="pip-conv">
              Conversion rate — {cleanQuote} to {cleanAccount} (how many{" "}
              {cleanAccount} per 1 {cleanQuote})
            </label>
            <input
              className="tool-input"
              id="pip-conv"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              placeholder="e.g. 0.92"
              value={convRate}
              onChange={(e) => setConvRate(e.target.value)}
            />
          </div>
        ) : null}
      </div>

      {results ? (
        <>
          {results.pipValueAccount !== null ? (
            <div className="tool-result" role="status" aria-live="polite">
              <p className="tool-result-label">PIP VALUE (IN {cleanAccount})</p>
              <div className="tool-result-value">
                {fmt(results.pipValueAccount, cleanAccount)}
                <span className="tool-result-label"> per pip</span>
              </div>
            </div>
          ) : (
            <div className="tool-error" role="status" aria-live="polite">
              Enter the {cleanQuote}→{cleanAccount} conversion rate above to show
              the pip value in your account currency.
            </div>
          )}

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {fmt(results.pipValueQuote, cleanQuote)}
              </div>
              <div className="tool-stat-label">Pip value (in {cleanQuote})</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.pipValueAccount !== null
                  ? fmt(results.pipValueAccount * 10, cleanAccount)
                  : "—"}
              </div>
              <div className="tool-stat-label">Value of 10 pips</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {results.units.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Total units traded</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{results.pipSize}</div>
              <div className="tool-stat-label">One pip = </div>
            </div>
          </div>

          <p className="tool-note">
            Pip value = pip size × units traded, expressed in the quote currency,
            then converted into your account currency.
            {results.conversionUsed === "base"
              ? ` Because your account currency matches the base currency, the quote-currency value is divided by the current pair price (${price}).`
              : results.conversionUsed === "quote"
              ? " Your account currency matches the quote currency, so no conversion is needed."
              : results.conversionUsed === "custom"
              ? " Your account currency differs from both sides of the pair, so the value is multiplied by the conversion rate you supplied."
              : ""}{" "}
            {cleanQuote === "JPY"
              ? "JPY-quoted pairs use 0.01 as one pip."
              : "This pair uses 0.0001 as one pip."}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a 3-letter base, quote and account currency, a position size and
          the current pair price to calculate the value of one pip.
        </p>
      )}
    </div>
  );
}
