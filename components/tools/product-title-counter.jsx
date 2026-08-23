"use client";

import { useMemo, useState } from "react";

const MARKETPLACES = [
  {
    id: "amazon",
    label: "Amazon",
    limit: 200,
    note: "Product title (varies by category; 200 is the common cap)",
  },
  { id: "ebay", label: "eBay", limit: 80, note: "Listing title" },
  { id: "etsy", label: "Etsy", limit: 140, note: "Listing title" },
  {
    id: "shopify",
    label: "Shopify / Google",
    limit: 150,
    note: "Product title & Google Shopping title",
  },
];

export default function ProductTitleCounter() {
  const [title, setTitle] = useState("");

  const stats = useMemo(() => {
    const value = title || "";
    // Array.from counts characters correctly, including emoji / accents.
    const chars = Array.from(value).length;
    const trimmed = value.trim();
    const words = trimmed === "" ? 0 : trimmed.split(/\s+/).length;
    return { chars, words };
  }, [title]);

  const rows = useMemo(
    () =>
      MARKETPLACES.map((m) => {
        const remaining = m.limit - stats.chars;
        const over = remaining < 0;
        const near =
          !over && remaining <= Math.max(5, Math.round(m.limit * 0.1));
        const pct =
          m.limit > 0 ? Math.min(100, (stats.chars / m.limit) * 100) : 0;
        return { ...m, remaining, over, near, pct };
      }),
    [stats.chars]
  );

  const fmt = (n) => n.toLocaleString("en-US");

  const colorFor = (row) =>
    row.over ? "#dc2626" : row.near ? "#d97706" : "#16a34a";

  const barColorFor = (row) =>
    row.over ? "#dc2626" : row.near ? "#d97706" : "currentColor";

  const overCount = rows.filter((r) => r.over).length;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ptc-title">
            Product title
          </label>
          <textarea
            className="tool-textarea"
            id="ptc-title"
            rows={3}
            placeholder="e.g. Stainless Steel Insulated Water Bottle 32oz, Leak-Proof, BPA-Free"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
        </div>
      </div>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.chars)}</div>
          <div className="tool-stat-label">Characters</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fmt(stats.words)}</div>
          <div className="tool-stat-label">Words</div>
        </div>
        <div className="tool-stat">
          <div
            className="tool-stat-num"
            style={overCount > 0 ? { color: "#dc2626" } : undefined}
          >
            {overCount}
          </div>
          <div className="tool-stat-label">
            Over limit ({overCount === 1 ? "marketplace" : "marketplaces"})
          </div>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          flexDirection: "column",
          gap: "0.75rem",
          marginTop: "1rem",
        }}
      >
        {rows.map((row) => (
          <div
            key={row.id}
            style={{
              border: "1px solid rgba(128,128,128,0.28)",
              borderRadius: "10px",
              padding: "0.85rem 1rem",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "baseline",
                gap: "0.75rem",
                flexWrap: "wrap",
              }}
            >
              <div>
                <div style={{ fontWeight: 600 }}>{row.label}</div>
                <div
                  className="tool-note"
                  style={{ margin: "0.15rem 0 0" }}
                >
                  {row.note}
                </div>
              </div>
              <div style={{ textAlign: "right" }}>
                <div
                  style={{
                    fontWeight: 700,
                    color: colorFor(row),
                    whiteSpace: "nowrap",
                  }}
                >
                  {fmt(stats.chars)} / {fmt(row.limit)}
                </div>
                <div
                  style={{
                    fontSize: "0.85rem",
                    color: colorFor(row),
                    whiteSpace: "nowrap",
                  }}
                >
                  {row.over
                    ? `${fmt(Math.abs(row.remaining))} over`
                    : `${fmt(row.remaining)} left`}
                </div>
              </div>
            </div>

            <div
              aria-hidden="true"
              style={{
                marginTop: "0.6rem",
                height: "7px",
                borderRadius: "999px",
                background: "rgba(128,128,128,0.2)",
                overflow: "hidden",
              }}
            >
              <div
                style={{
                  width: `${row.pct}%`,
                  height: "100%",
                  borderRadius: "999px",
                  background: barColorFor(row),
                  transition: "width 0.15s ease",
                }}
              />
            </div>

            <div
              style={{
                marginTop: "0.45rem",
                fontSize: "0.85rem",
                fontWeight: 600,
                color: colorFor(row),
              }}
            >
              {row.over
                ? `Over by ${fmt(Math.abs(row.remaining))} character${
                    Math.abs(row.remaining) === 1 ? "" : "s"
                  }`
                : `Fits with ${fmt(row.remaining)} to spare`}
            </div>
          </div>
        ))}
      </div>

      <p className="tool-note">
        Limits shown are the common public title caps: Amazon 200, eBay 80, Etsy
        140, and Shopify / Google Shopping 150 characters. Some Amazon categories
        allow fewer than 200, so treat that figure as an upper bound. Characters
        are counted with correct emoji handling, so one emoji counts as a single
        character.
      </p>
      <p className="tool-note">
        This tool is completely free and runs entirely in your browser. Nothing
        you type is ever uploaded or stored.
      </p>
    </div>
  );
}
