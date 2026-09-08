"use client";

import { useState, useMemo } from "react";

const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

const usd4 = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 6,
});

function pct(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return `${new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value)}%`;
}

function qtyFmt(value) {
  if (value === null || value === undefined || !Number.isFinite(value)) return "—";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 8,
  }).format(value);
}

function toNumber(value) {
  if (value === null || value === undefined) return null;
  const trimmed = String(value).trim();
  if (trimmed === "") return null;
  const n = Number(trimmed);
  return Number.isFinite(n) ? n : null;
}

export default function CryptoProfitCalculator() {
  const [mode, setMode] = useState("invest"); // "invest" = enter dollars, "qty" = enter coins
  const [investment, setInvestment] = useState("1000");
  const [quantity, setQuantity] = useState("0.02");
  const [buyPrice, setBuyPrice] = useState("50000");
  const [sellPrice, setSellPrice] = useState("65000");
  const [buyFee, setBuyFee] = useState("0.1");
  const [sellFee, setSellFee] = useState("0.1");

  const result = useMemo(() => {
    const buy = toNumber(buyPrice);
    const sell = toNumber(sellPrice);
    if (buy === null || buy <= 0) return null;

    const buyFeeRate = Math.max(toNumber(buyFee) ?? 0, 0) / 100;
    const sellFeeRate = Math.max(toNumber(sellFee) ?? 0, 0) / 100;

    // Determine the number of coins purchased.
    let coins;
    let baseInvested; // amount spent buying coins, before buy fee
    if (mode === "qty") {
      const q = toNumber(quantity);
      if (q === null || q <= 0) return null;
      coins = q;
      baseInvested = coins * buy;
    } else {
      const inv = toNumber(investment);
      if (inv === null || inv <= 0) return null;
      // Investment is the total cash outlay including the buy fee.
      // outlay = coins*buy*(1+buyFeeRate)  =>  coins = outlay / (buy*(1+buyFeeRate))
      coins = inv / (buy * (1 + buyFeeRate));
      baseInvested = coins * buy;
    }

    const buyFeeAmount = baseInvested * buyFeeRate;
    const totalCost = baseInvested + buyFeeAmount; // total cash out

    const grossProceeds = coins * sell;
    const sellFeeAmount = grossProceeds * sellFeeRate;
    const netProceeds = grossProceeds - sellFeeAmount; // cash back in

    const profit = netProceeds - totalCost;
    const roi = (profit / totalCost) * 100;
    const multiple = netProceeds / totalCost;
    const totalFees = buyFeeAmount + sellFeeAmount;

    // Break-even sell price: price where netProceeds == totalCost
    // coins*price*(1-sellFeeRate) = totalCost
    const breakEven =
      coins > 0 && 1 - sellFeeRate > 0
        ? totalCost / (coins * (1 - sellFeeRate))
        : null;

    return {
      coins,
      totalCost,
      buyFeeAmount,
      sellFeeAmount,
      totalFees,
      grossProceeds,
      netProceeds,
      profit,
      roi,
      multiple,
      breakEven,
      isProfit: profit >= 0,
    };
  }, [mode, investment, quantity, buyPrice, sellPrice, buyFee, sellFee]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpc-mode">
              Position entered as
            </label>
            <select
              className="tool-select"
              id="cpc-mode"
              value={mode}
              onChange={(e) => setMode(e.target.value)}
            >
              <option value="invest">Dollars invested</option>
              <option value="qty">Quantity of coins</option>
            </select>
          </div>
          {mode === "invest" ? (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpc-investment">
                Amount invested ($)
              </label>
              <input
                className="tool-input"
                id="cpc-investment"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                value={investment}
                onChange={(e) => setInvestment(e.target.value)}
                placeholder="e.g. 1000"
              />
            </div>
          ) : (
            <div className="tool-field">
              <label className="tool-label" htmlFor="cpc-quantity">
                Quantity (coins)
              </label>
              <input
                className="tool-input"
                id="cpc-quantity"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 0.02"
              />
            </div>
          )}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpc-buy">
              Buy price ($ per coin)
            </label>
            <input
              className="tool-input"
              id="cpc-buy"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={buyPrice}
              onChange={(e) => setBuyPrice(e.target.value)}
              placeholder="e.g. 50000"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpc-sell">
              Sell price ($ per coin)
            </label>
            <input
              className="tool-input"
              id="cpc-sell"
              type="number"
              inputMode="decimal"
              min="0"
              step="any"
              value={sellPrice}
              onChange={(e) => setSellPrice(e.target.value)}
              placeholder="e.g. 65000"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpc-buyfee">
              Buy fee (%)
            </label>
            <input
              className="tool-input"
              id="cpc-buyfee"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={buyFee}
              onChange={(e) => setBuyFee(e.target.value)}
              placeholder="e.g. 0.1"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cpc-sellfee">
              Sell fee (%)
            </label>
            <input
              className="tool-input"
              id="cpc-sellfee"
              type="number"
              inputMode="decimal"
              min="0"
              max="100"
              step="0.01"
              value={sellFee}
              onChange={(e) => setSellFee(e.target.value)}
              placeholder="e.g. 0.1"
            />
          </div>
        </div>
      </div>

      {result ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {result.isProfit ? "Net profit" : "Net loss"}
            </p>
            <div className="tool-result-value">{usd.format(result.profit)}</div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{pct(result.roi)}</div>
              <div className="tool-stat-label">Return (ROI)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.multiple.toFixed(2)}x</div>
              <div className="tool-stat-label">Multiple on cost</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{qtyFmt(result.coins)}</div>
              <div className="tool-stat-label">Coins held</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.totalCost)}</div>
              <div className="tool-stat-label">Total cost (with fee)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {usd.format(result.netProceeds)}
              </div>
              <div className="tool-stat-label">Net proceeds</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{usd.format(result.totalFees)}</div>
              <div className="tool-stat-label">Total fees</div>
            </div>
          </div>

          {result.breakEven !== null ? (
            <p className="tool-note">
              Break-even sell price:{" "}
              <strong>{usd4.format(result.breakEven)}</strong> per coin — sell
              above this to profit after fees.
            </p>
          ) : null}

          <p className="tool-note">
            Profit = net sale proceeds − total cost. Total cost = coins × buy
            price + buy fee. Net proceeds = coins × sell price − sell fee. ROI =
            profit ÷ total cost. Blank or zero fee fields are treated as 0%.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter a buy price above $0 and either an amount invested or a coin
          quantity to see your crypto profit, ROI, and break-even price.
        </p>
      )}
    </div>
  );
}
