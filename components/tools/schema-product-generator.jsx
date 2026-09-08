"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// ISO 4217 currency codes commonly used for storefronts.
const CURRENCIES = [
  "USD", "EUR", "GBP", "CAD", "AUD", "JPY", "INR", "BRL", "MXN",
  "CHF", "CNY", "SEK", "NZD", "SGD", "ZAR", "AED", "PLN", "DKK",
];

const AVAILABILITY = [
  { value: "InStock", label: "In stock" },
  { value: "OutOfStock", label: "Out of stock" },
  { value: "PreOrder", label: "Pre-order" },
  { value: "BackOrder", label: "Back-order" },
  { value: "Discontinued", label: "Discontinued" },
];

const CONDITION = [
  { value: "NewCondition", label: "New" },
  { value: "UsedCondition", label: "Used" },
  { value: "RefurbishedCondition", label: "Refurbished" },
  { value: "DamagedCondition", label: "Damaged" },
];

// Split a textarea of image URLs into a clean array (one per line or comma).
function parseImages(raw) {
  return String(raw || "")
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function isValidUrl(raw) {
  const s = String(raw || "").trim();
  if (!s) return false;
  try {
    const u = new URL(s);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

// Build the schema.org Product object + collect human-readable warnings.
function buildSchema(f) {
  const warnings = [];
  const name = f.name.trim();

  const product = { "@context": "https://schema.org/", "@type": "Product" };

  if (name) product.name = name;
  else warnings.push("Add a product name — it is required for Product rich results.");

  if (f.description.trim()) product.description = f.description.trim();

  const images = parseImages(f.images);
  if (images.length) {
    const bad = images.filter((u) => !isValidUrl(u));
    if (bad.length) {
      warnings.push("Some image URLs are not valid http(s) links — Google ignores those.");
    }
    product.image = images.length === 1 ? images[0] : images;
  } else {
    warnings.push("Add at least one image URL — Google strongly recommends it for Product results.");
  }

  if (f.brand.trim()) {
    product.brand = { "@type": "Brand", name: f.brand.trim() };
  }
  if (f.sku.trim()) product.sku = f.sku.trim();
  if (f.mpn.trim()) product.mpn = f.mpn.trim();

  const gtin = f.gtin.trim();
  if (gtin) {
    if (!/^\d{8}(\d{4}|\d{5}|\d{6})?$/.test(gtin.replace(/\s/g, ""))) {
      // Accept common GTIN lengths (8/12/13/14); warn otherwise but still include.
      if (!/^\d{8}$|^\d{12,14}$/.test(gtin.replace(/\s/g, ""))) {
        warnings.push("GTIN should be 8, 12, 13 or 14 digits — double-check the value.");
      }
    }
    product.gtin = gtin.replace(/\s/g, "");
  }

  // Offer block.
  const price = f.price.trim();
  if (price !== "") {
    if (isNaN(Number(price)) || Number(price) < 0) {
      warnings.push("Price must be a non-negative number (no currency symbol).");
    }
    const offer = {
      "@type": "Offer",
      priceCurrency: f.currency,
      price: price,
      availability: "https://schema.org/" + f.availability,
      itemCondition: "https://schema.org/" + f.condition,
    };
    if (f.priceValidUntil.trim()) offer.priceValidUntil = f.priceValidUntil.trim();
    if (f.sellerUrl.trim()) {
      if (isValidUrl(f.sellerUrl)) offer.url = f.sellerUrl.trim();
      else warnings.push("Product/offer URL is not a valid http(s) link.");
    }
    product.offers = offer;
  } else {
    warnings.push("Add a price so the Offer block is included — reviews without an offer won't show a price.");
  }

  // Aggregate rating block.
  const ratingVal = f.ratingValue.trim();
  const ratingCount = f.reviewCount.trim();
  if (ratingVal !== "" || ratingCount !== "") {
    const rv = Number(ratingVal);
    const rc = Number(ratingCount);
    const okVal = ratingVal !== "" && !isNaN(rv) && rv >= 0 && rv <= 5;
    const okCount = ratingCount !== "" && !isNaN(rc) && rc >= 1;
    if (okVal && okCount) {
      product.aggregateRating = {
        "@type": "AggregateRating",
        ratingValue: ratingVal,
        reviewCount: String(Math.round(rc)),
        bestRating: "5",
        worstRating: "1",
      };
    } else {
      warnings.push(
        "To show star ratings, set BOTH a rating value (0–5) AND a review count (1 or more)."
      );
    }
  }

  return { product, warnings };
}

// Pretty-print with 2-space indent, then wrap in a <script> tag.
function toScript(obj) {
  const json = JSON.stringify(obj, null, 2);
  return '<script type="application/ld+json">\n' + json + "\n</script>";
}

export default function SchemaProductGenerator() {
  const [f, setF] = useState({
    name: "Aeron Ergonomic Office Chair",
    description: "Breathable mesh office chair with adjustable lumbar support and tilt lock.",
    images: "https://example.com/images/aeron-chair.jpg",
    brand: "Herman Miller",
    sku: "AER-001-BLK",
    mpn: "",
    gtin: "",
    price: "1395.00",
    currency: "USD",
    availability: "InStock",
    condition: "NewCondition",
    priceValidUntil: "",
    sellerUrl: "https://example.com/products/aeron-chair",
    ratingValue: "4.6",
    reviewCount: "218",
  });
  const [copied, setCopied] = useState(false);

  const set = (key) => (e) =>
    setF((prev) => ({ ...prev, [key]: e.target.value }));

  const { product, warnings } = useMemo(() => buildSchema(f), [f]);

  const hasContent = f.name.trim() !== "";
  const output = useMemo(() => (hasContent ? toScript(product) : ""), [product, hasContent]);

  const fieldCount = useMemo(
    () => Object.keys(product).filter((k) => k !== "@context" && k !== "@type").length,
    [product]
  );

  async function handleCopy() {
    if (!output) return;
    try {
      await copyText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!output) return;
    const blob = new Blob([JSON.stringify(product, null, 2)], {
      type: "application/ld+json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "product-schema.json";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sp-name">
            Product name (required)
          </label>
          <input
            className="tool-input"
            id="sp-name"
            type="text"
            value={f.name}
            onChange={set("name")}
            placeholder="Aeron Ergonomic Office Chair"
            autoComplete="off"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sp-desc">
            Description
          </label>
          <textarea
            className="tool-textarea"
            id="sp-desc"
            value={f.description}
            onChange={set("description")}
            rows={2}
            placeholder="Short product description."
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sp-images">
            Image URL(s) — one per line
          </label>
          <textarea
            className="tool-textarea"
            id="sp-images"
            value={f.images}
            onChange={set("images")}
            rows={2}
            placeholder="https://example.com/image1.jpg"
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-brand">
              Brand
            </label>
            <input
              className="tool-input"
              id="sp-brand"
              type="text"
              value={f.brand}
              onChange={set("brand")}
              placeholder="Herman Miller"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-sku">
              SKU
            </label>
            <input
              className="tool-input"
              id="sp-sku"
              type="text"
              value={f.sku}
              onChange={set("sku")}
              placeholder="AER-001-BLK"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-mpn">
              MPN
            </label>
            <input
              className="tool-input"
              id="sp-mpn"
              type="text"
              value={f.mpn}
              onChange={set("mpn")}
              placeholder="Manufacturer part number"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-gtin">
              GTIN / UPC / EAN
            </label>
            <input
              className="tool-input"
              id="sp-gtin"
              type="text"
              value={f.gtin}
              onChange={set("gtin")}
              placeholder="8/12/13/14 digits"
              autoComplete="off"
              inputMode="numeric"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-price">
              Price
            </label>
            <input
              className="tool-input"
              id="sp-price"
              type="text"
              value={f.price}
              onChange={set("price")}
              placeholder="1395.00"
              autoComplete="off"
              inputMode="decimal"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-currency">
              Currency
            </label>
            <select
              className="tool-select"
              id="sp-currency"
              value={f.currency}
              onChange={set("currency")}
            >
              {CURRENCIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-avail">
              Availability
            </label>
            <select
              className="tool-select"
              id="sp-avail"
              value={f.availability}
              onChange={set("availability")}
            >
              {AVAILABILITY.map((a) => (
                <option key={a.value} value={a.value}>
                  {a.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-cond">
              Condition
            </label>
            <select
              className="tool-select"
              id="sp-cond"
              value={f.condition}
              onChange={set("condition")}
            >
              {CONDITION.map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-valid">
              Price valid until
            </label>
            <input
              className="tool-input"
              id="sp-valid"
              type="date"
              value={f.priceValidUntil}
              onChange={set("priceValidUntil")}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="sp-seller">
            Product / offer URL
          </label>
          <input
            className="tool-input"
            id="sp-seller"
            type="text"
            value={f.sellerUrl}
            onChange={set("sellerUrl")}
            placeholder="https://example.com/products/aeron-chair"
            autoComplete="off"
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-rating">
              Rating value (0–5)
            </label>
            <input
              className="tool-input"
              id="sp-rating"
              type="text"
              value={f.ratingValue}
              onChange={set("ratingValue")}
              placeholder="4.6"
              autoComplete="off"
              inputMode="decimal"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="sp-reviews">
              Review count
            </label>
            <input
              className="tool-input"
              id="sp-reviews"
              type="text"
              value={f.reviewCount}
              onChange={set("reviewCount")}
              placeholder="218"
              autoComplete="off"
              inputMode="numeric"
            />
          </div>
        </div>
      </div>

      {output ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fieldCount}</div>
              <div className="tool-stat-label">properties</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {product.offers ? "Yes" : "No"}
              </div>
              <div className="tool-stat-label">offer block</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {product.aggregateRating ? "Yes" : "No"}
              </div>
              <div className="tool-stat-label">star rating</div>
            </div>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy JSON-LD"}
              </button>
              <button className="btn" type="button" onClick={handleDownload}>
                Download .json
              </button>
            </div>
            <label className="tool-label" htmlFor="sp-output">
              Product schema (JSON-LD)
            </label>
            <pre className="tool-output" id="sp-output" role="status" aria-live="polite">
              {output}
            </pre>
          </div>

          {warnings.length ? (
            <div className="tool-note">
              {warnings.map((w, i) => (
                <div key={i}>• {w}</div>
              ))}
            </div>
          ) : null}

          <p className="tool-note">
            Paste this whole &lt;script&gt; block into the &lt;head&gt; (or anywhere
            in the &lt;body&gt;) of the product page it describes. The values must
            match what shoppers actually see on the page. Test it with Google&apos;s
            Rich Results Test before relying on it. Everything here is generated in
            your browser — nothing is uploaded.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Fill in your product details above and a valid schema.org Product JSON-LD
          snippet appears here, ready to paste into your page. A product name is the
          minimum required.
        </p>
      )}
    </div>
  );
}
