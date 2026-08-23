"use client";

import { useMemo, useState } from "react";

const money = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

function toNum(v) {
  const n = parseFloat(v);
  return Number.isFinite(n) ? n : 0;
}

let uid = 0;
const newItem = (name = "", qty = "1", price = "") => ({
  id: ++uid,
  name,
  qty,
  price,
});

const PAYMENT_METHODS = [
  "Cash",
  "Credit Card",
  "Debit Card",
  "Visa",
  "Mastercard",
  "American Express",
  "Apple Pay",
  "Google Pay",
  "PayPal",
  "Venmo",
  "Zelle",
  "Check",
  "Gift Card",
  "Bank Transfer",
  "Other",
];

// Print CSS that isolates the receipt card: everything on the page is hidden
// during print except the receipt and its contents. Using `visibility` (rather
// than `display`) lets the receipt's ancestors stay in the layout so the card
// can be positioned at the top of the printed page, without needing to know the
// host page's structure.
const PRINT_CSS = `
@media print {
  body * { visibility: hidden !important; }
  #ebt-receipt-print, #ebt-receipt-print * { visibility: visible !important; }
  #ebt-receipt-print {
    position: absolute !important;
    left: 0 !important;
    top: 0 !important;
    margin: 0 !important;
    width: 100% !important;
    max-width: none !important;
    box-shadow: none !important;
    border: none !important;
  }
  @page { margin: 12mm; }
}
`;

export default function ReceiptGenerator() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);

  const [businessName, setBusinessName] = useState("The Corner Store");
  const [date, setDate] = useState(today);
  const [taxRate, setTaxRate] = useState("8.25");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
  const [footer, setFooter] = useState("Thank you for your purchase!");
  const [items, setItems] = useState([
    newItem("Coffee", "2", "3.50"),
    newItem("Blueberry Muffin", "1", "3.25"),
  ]);

  const totals = useMemo(() => {
    const lineAmounts = items.map((it) => toNum(it.qty) * toNum(it.price));
    const subtotal = lineAmounts.reduce((s, a) => s + a, 0);
    const rate = Math.max(0, toNum(taxRate));
    const tax = subtotal * (rate / 100);
    const total = subtotal + tax;
    const totalQty = items.reduce((s, it) => s + toNum(it.qty), 0);
    return { lineAmounts, subtotal, tax, total, rate, totalQty };
  }, [items, taxRate]);

  function updateItem(id, field, value) {
    setItems((prev) => prev.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  }
  function addItem() {
    setItems((prev) => [...prev, newItem()]);
  }
  function removeItem(id) {
    setItems((prev) => (prev.length > 1 ? prev.filter((it) => it.id !== id) : prev));
  }

  function handlePrint() {
    if (typeof window !== "undefined") window.print();
  }

  const fmtDate = (d) => {
    if (!d) return "";
    const parsed = new Date(d + "T00:00:00");
    if (Number.isNaN(parsed.getTime())) return d;
    return parsed.toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  const rate2 = Math.round(totals.rate * 100) / 100;

  // Self-contained, theme-neutral "paper" receipt: an explicit white card with
  // its own colors and a monospace face, so it reads identically in light and
  // dark UI and when printed.
  const paper = {
    background: "#ffffff",
    color: "#1a1a1a",
    width: "min(340px, 100%)",
    margin: "0 auto",
    padding: "24px 22px",
    borderRadius: 8,
    border: "1px solid rgba(0,0,0,0.10)",
    boxShadow: "0 1px 3px rgba(0,0,0,0.12), 0 8px 24px rgba(0,0,0,0.08)",
    fontFamily:
      'ui-monospace, SFMono-Regular, "SF Mono", Menlo, Consolas, "Liberation Mono", monospace',
    fontSize: 13,
    lineHeight: 1.5,
    boxSizing: "border-box",
  };
  const dashed = "1px dashed rgba(0,0,0,0.35)";
  const rowStyle = {
    display: "flex",
    justifyContent: "space-between",
    gap: 12,
    fontVariantNumeric: "tabular-nums",
  };

  return (
    <div className="tool">
      <style dangerouslySetInnerHTML={{ __html: PRINT_CSS }} />

      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="rcpt-business">Business name</label>
            <input
              className="tool-input"
              id="rcpt-business"
              type="text"
              placeholder="Your business name"
              value={businessName}
              onChange={(e) => setBusinessName(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="rcpt-date">Date</label>
            <input
              className="tool-input"
              id="rcpt-date"
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
        </div>
      </div>

      {/* Line items */}
      <div style={{ marginTop: 22 }}>
        <div className="tool-label" style={{ marginBottom: 8 }}>Items</div>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, idx) => (
            <div
              key={it.id}
              className="lineitem-row"
            >
              <input
                className="tool-input"
                type="text"
                aria-label={`Item ${idx + 1} name`}
                placeholder="Item"
                value={it.name}
                onChange={(e) => updateItem(it.id, "name", e.target.value)}
              />
              <input
                className="tool-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                aria-label={`Item ${idx + 1} quantity`}
                placeholder="Qty"
                value={it.qty}
                onChange={(e) => updateItem(it.id, "qty", e.target.value)}
              />
              <input
                className="tool-input"
                type="number"
                inputMode="decimal"
                min="0"
                step="any"
                aria-label={`Item ${idx + 1} price`}
                placeholder="Unit price"
                value={it.price}
                onChange={(e) => updateItem(it.id, "price", e.target.value)}
              />
              <div
                aria-label={`Item ${idx + 1} amount`}
                style={{
                  textAlign: "right",
                  fontVariantNumeric: "tabular-nums",
                  whiteSpace: "nowrap",
                  fontSize: 14,
                }}
              >
                {money.format(totals.lineAmounts[idx] || 0)}
              </div>
              <button
                type="button"
                className="btn"
                onClick={() => removeItem(it.id)}
                disabled={items.length <= 1}
                aria-label={`Remove item ${idx + 1}`}
                title="Remove item"
                style={{ padding: "8px 0", minWidth: 36 }}
              >
                ✕
              </button>
            </div>
          ))}
        </div>
        <div className="tool-actions" style={{ marginTop: 10 }}>
          <button type="button" className="btn" onClick={addItem}>+ Add item</button>
        </div>
      </div>

      <div className="tool-row" style={{ marginTop: 18 }}>
        <div className="tool-field">
          <label className="tool-label" htmlFor="rcpt-tax">Tax rate (%)</label>
          <input
            className="tool-input"
            id="rcpt-tax"
            type="number"
            inputMode="decimal"
            min="0"
            step="any"
            placeholder="0"
            value={taxRate}
            onChange={(e) => setTaxRate(e.target.value)}
          />
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="rcpt-payment">Payment method</label>
          <select
            className="tool-select"
            id="rcpt-payment"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
          >
            {PAYMENT_METHODS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </div>
        <div className="tool-field">
          <label className="tool-label" htmlFor="rcpt-footer">Footer message</label>
          <input
            className="tool-input"
            id="rcpt-footer"
            type="text"
            placeholder="Thank you!"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
          />
        </div>
      </div>

      {/* Totals summary */}
      <div className="tool-stat-grid" style={{ marginTop: 18 }}>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.subtotal)}</div>
          <div className="tool-stat-label">Subtotal</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.tax)}</div>
          <div className="tool-stat-label">Tax ({rate2}%)</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{money.format(totals.total)}</div>
          <div className="tool-stat-label">Total</div>
        </div>
      </div>

      <div className="tool-actions" style={{ marginTop: 16 }}>
        <button type="button" className="btn btn-primary" onClick={handlePrint}>
          🖨 Print receipt
        </button>
      </div>

      {/* Live receipt preview */}
      <div className="tool-label" style={{ marginTop: 24, marginBottom: 8 }}>Preview</div>
      <div id="ebt-receipt-print" style={paper}>
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: 16, fontWeight: 700, textTransform: "uppercase", letterSpacing: 1, wordBreak: "break-word" }}>
            {businessName || "Your Business"}
          </div>
          <div style={{ marginTop: 6, fontSize: 12 }}>{fmtDate(date)}</div>
        </div>

        <div style={{ borderTop: dashed, margin: "14px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {items.map((it, idx) => {
            const qty = toNum(it.qty);
            const price = toNum(it.price);
            return (
              <div key={it.id}>
                <div style={rowStyle}>
                  <span style={{ wordBreak: "break-word", flex: "1 1 auto" }}>
                    {it.name || "Item"}
                  </span>
                  <span style={{ whiteSpace: "nowrap" }}>
                    {money.format(totals.lineAmounts[idx] || 0)}
                  </span>
                </div>
                <div style={{ fontSize: 11, color: "#666" }}>
                  {qty} × {money.format(price)}
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ borderTop: dashed, margin: "14px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
          <div style={rowStyle}>
            <span>Subtotal</span>
            <span>{money.format(totals.subtotal)}</span>
          </div>
          <div style={rowStyle}>
            <span>Tax ({rate2}%)</span>
            <span>{money.format(totals.tax)}</span>
          </div>
          <div style={{ ...rowStyle, fontWeight: 700, fontSize: 15, marginTop: 4 }}>
            <span>TOTAL</span>
            <span>{money.format(totals.total)}</span>
          </div>
        </div>

        <div style={{ borderTop: dashed, margin: "14px 0" }} />

        <div style={{ display: "flex", flexDirection: "column", gap: 4, fontSize: 12 }}>
          <div style={rowStyle}>
            <span>Items</span>
            <span>{Math.round(totals.totalQty * 1000) / 1000}</span>
          </div>
          <div style={rowStyle}>
            <span>Paid by</span>
            <span>{paymentMethod}</span>
          </div>
        </div>

        {footer && footer.trim() !== "" && (
          <div style={{ textAlign: "center", marginTop: 16, fontSize: 12, wordBreak: "break-word" }}>
            {footer}
          </div>
        )}
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Everything runs in your browser — nothing you type is uploaded. Print uses your browser's
        print dialog, so you can save the receipt as a PDF from there too.
      </p>
    </div>
  );
}
