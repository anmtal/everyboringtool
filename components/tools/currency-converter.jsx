"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// Daily reference rates from Frankfurter (European Central Bank data) — free, no
// key, CORS-enabled. Rates for the base come back keyed by the other currencies;
// we cache each base so swapping back doesn't refetch. All amount math is local.
const API = "https://api.frankfurter.app/latest";

// Frankfurter's supported currencies (ECB set). Popular ones first, then the rest.
const CURRENCIES = [
  ["USD", "US Dollar"], ["EUR", "Euro"], ["GBP", "British Pound"], ["JPY", "Japanese Yen"],
  ["AUD", "Australian Dollar"], ["CAD", "Canadian Dollar"], ["CHF", "Swiss Franc"], ["CNY", "Chinese Yuan"],
  ["INR", "Indian Rupee"], ["SGD", "Singapore Dollar"], ["NZD", "New Zealand Dollar"], ["HKD", "Hong Kong Dollar"],
  ["BGN", "Bulgarian Lev"], ["BRL", "Brazilian Real"], ["CZK", "Czech Koruna"], ["DKK", "Danish Krone"],
  ["HUF", "Hungarian Forint"], ["IDR", "Indonesian Rupiah"], ["ILS", "Israeli Shekel"], ["ISK", "Icelandic Krona"],
  ["KRW", "South Korean Won"], ["MXN", "Mexican Peso"], ["MYR", "Malaysian Ringgit"], ["NOK", "Norwegian Krone"],
  ["PHP", "Philippine Peso"], ["PLN", "Polish Zloty"], ["RON", "Romanian Leu"], ["SEK", "Swedish Krona"],
  ["THB", "Thai Baht"], ["TRY", "Turkish Lira"], ["ZAR", "South African Rand"],
];

function fmtMoney(n, code) {
  if (!Number.isFinite(n)) return "—";
  try {
    return new Intl.NumberFormat("en-US", { style: "currency", currency: code, maximumFractionDigits: n < 1 ? 6 : 2 }).format(n);
  } catch {
    return n.toFixed(2) + " " + code;
  }
}
function fmtRate(n) {
  if (!Number.isFinite(n)) return "—";
  return new Intl.NumberFormat("en-US", { maximumFractionDigits: 6 }).format(n);
}

export default function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
  const [rates, setRates] = useState(null); // rates for the currently-loaded base
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("loading"); // loading | ok | error
  const cache = useRef({}); // base -> { rates, date }

  useEffect(() => {
    let cancelled = false;
    if (cache.current[from]) {
      setRates(cache.current[from].rates);
      setDate(cache.current[from].date);
      setStatus("ok");
      return;
    }
    setStatus("loading");
    fetch(`${API}?from=${encodeURIComponent(from)}`)
      .then((r) => {
        if (!r.ok) throw new Error("bad status");
        return r.json();
      })
      .then((j) => {
        if (cancelled) return;
        const r = { ...(j.rates || {}), [from]: 1 };
        cache.current[from] = { rates: r, date: j.date || "" };
        setRates(r);
        setDate(j.date || "");
        setStatus("ok");
      })
      .catch(() => {
        if (!cancelled) setStatus("error");
      });
    return () => { cancelled = true; };
  }, [from]);

  const amt = useMemo(() => {
    const n = parseFloat(String(amount).replace(/,/g, ""));
    return Number.isFinite(n) ? n : null;
  }, [amount]);

  const rate = rates ? rates[to] : null;
  const converted = amt != null && rate != null ? amt * rate : null;

  function swap() {
    setFrom(to);
    setTo(from);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="cc-amount">Amount</label>
          <input
            id="cc-amount" className="tool-input" type="number" inputMode="decimal"
            min="0" step="any" placeholder="100" value={amount}
            onChange={(e) => setAmount(e.target.value)}
          />
        </div>
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-from">From</label>
            <select id="cc-from" className="tool-select" value={from} onChange={(e) => setFrom(e.target.value)}>
              {CURRENCIES.map(([c, n]) => <option key={c} value={c}>{c} — {n}</option>)}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="cc-to">To</label>
            <select id="cc-to" className="tool-select" value={to} onChange={(e) => setTo(e.target.value)}>
              {CURRENCIES.map(([c, n]) => <option key={c} value={c}>{c} — {n}</option>)}
            </select>
          </div>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn" onClick={swap} aria-label="Swap the from and to currencies">⇅ Swap</button>
      </div>

      {status === "error" ? (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-note" style={{ color: "var(--danger, #b4462d)" }}>
            Couldn't load today's exchange rates — the rate service may be busy or offline.
            Check your connection and{" "}
            <button type="button" className="btn btn-sm" onClick={() => { delete cache.current[from]; setFrom((f) => f); setStatus("loading"); }}>
              try again
            </button>.
          </p>
        </div>
      ) : (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">
              {amt != null ? `${new Intl.NumberFormat("en-US").format(amt)} ${from} =` : `${from} →`} {to}
            </p>
            <div className="tool-result-value">
              {status === "loading" ? "…" : converted != null ? fmtMoney(converted, to) : "—"}
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{rate != null ? fmtRate(rate) : "—"}</div>
              <div className="tool-stat-label">1 {from} in {to}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{rate ? fmtRate(1 / rate) : "—"}</div>
              <div className="tool-stat-label">1 {to} in {from}</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ fontSize: 15 }}>{date || "—"}</div>
              <div className="tool-stat-label">Rates as of</div>
            </div>
          </div>
        </>
      )}

      <p className="tool-note">
        Rates are the daily reference rates published by the European Central Bank (via the free
        Frankfurter API), updated once each working day around 16:00 CET — the same rates most banks
        base their pricing on. They're for information, not the exact rate a bank or card will give you.
        The amount you type is converted right in your browser.
      </p>
    </div>
  );
}
