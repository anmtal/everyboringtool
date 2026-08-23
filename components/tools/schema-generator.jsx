"use client";

import { useMemo, useState } from "react";

const SCHEMA_TYPES = [
  { value: "Organization", label: "Organization" },
  { value: "LocalBusiness", label: "Local Business" },
  { value: "Article", label: "Article" },
  { value: "Product", label: "Product" },
  { value: "Person", label: "Person" },
  { value: "FAQPage", label: "FAQ Page" },
];

const AVAILABILITY = [
  { value: "", label: "— select —" },
  { value: "https://schema.org/InStock", label: "In stock" },
  { value: "https://schema.org/OutOfStock", label: "Out of stock" },
  { value: "https://schema.org/PreOrder", label: "Pre-order" },
  { value: "https://schema.org/BackOrder", label: "Back-order" },
  { value: "https://schema.org/Discontinued", label: "Discontinued" },
];

const EMPTY_FIELDS = {
  // Organization
  name: "",
  url: "",
  logo: "",
  description: "",
  telephone: "",
  email: "",
  sameAs: "",
  // LocalBusiness address
  streetAddress: "",
  addressLocality: "",
  addressRegion: "",
  postalCode: "",
  addressCountry: "",
  priceRange: "",
  openingHours: "",
  // Article
  headline: "",
  authorName: "",
  publisherName: "",
  datePublished: "",
  dateModified: "",
  image: "",
  // Product
  brand: "",
  sku: "",
  price: "",
  priceCurrency: "USD",
  availability: "",
  // Person
  jobTitle: "",
};

// Trim + collapse to a real value or undefined so we never emit empty keys.
function val(v) {
  if (v == null) return undefined;
  const t = String(v).trim();
  return t ? t : undefined;
}

// Split a comma / newline separated list into a clean array (or undefined).
function list(v) {
  if (!v) return undefined;
  const items = String(v)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  return items.length ? items : undefined;
}

// Drop undefined values from an object; return undefined if nothing is left.
function clean(obj) {
  const out = {};
  let has = false;
  for (const key of Object.keys(obj)) {
    const v = obj[key];
    if (v === undefined) continue;
    if (Array.isArray(v) && v.length === 0) continue;
    if (typeof v === "object" && !Array.isArray(v) && Object.keys(v).length === 0)
      continue;
    out[key] = v;
    has = true;
  }
  return has ? out : undefined;
}

function buildSchema(type, f, faqs) {
  const base = { "@context": "https://schema.org", "@type": type };

  if (type === "Organization") {
    return clean({
      ...base,
      name: val(f.name),
      url: val(f.url),
      logo: val(f.logo),
      description: val(f.description),
      telephone: val(f.telephone),
      email: val(f.email),
      sameAs: list(f.sameAs),
    });
  }

  if (type === "LocalBusiness") {
    const address = clean({
      "@type": "PostalAddress",
      streetAddress: val(f.streetAddress),
      addressLocality: val(f.addressLocality),
      addressRegion: val(f.addressRegion),
      postalCode: val(f.postalCode),
      addressCountry: val(f.addressCountry),
    });
    return clean({
      ...base,
      name: val(f.name),
      description: val(f.description),
      url: val(f.url),
      telephone: val(f.telephone),
      email: val(f.email),
      priceRange: val(f.priceRange),
      openingHours: list(f.openingHours),
      address,
      sameAs: list(f.sameAs),
    });
  }

  if (type === "Article") {
    const author = clean({ "@type": "Person", name: val(f.authorName) });
    const publisher = clean({
      "@type": "Organization",
      name: val(f.publisherName),
      logo: f.logo
        ? clean({ "@type": "ImageObject", url: val(f.logo) })
        : undefined,
    });
    return clean({
      ...base,
      headline: val(f.headline),
      description: val(f.description),
      image: list(f.image),
      author,
      publisher,
      datePublished: val(f.datePublished),
      dateModified: val(f.dateModified),
      mainEntityOfPage: val(f.url),
    });
  }

  if (type === "Product") {
    const brand = f.brand
      ? clean({ "@type": "Brand", name: val(f.brand) })
      : undefined;
    let offers;
    if (val(f.price)) {
      const priceNum = Number(String(f.price).replace(/[^0-9.\-]/g, ""));
      offers = clean({
        "@type": "Offer",
        price: Number.isFinite(priceNum) ? String(priceNum) : val(f.price),
        priceCurrency: val(f.priceCurrency) || "USD",
        availability: val(f.availability),
        url: val(f.url),
      });
    }
    return clean({
      ...base,
      name: val(f.name),
      description: val(f.description),
      image: list(f.image),
      sku: val(f.sku),
      brand,
      offers,
    });
  }

  if (type === "Person") {
    return clean({
      ...base,
      name: val(f.name),
      jobTitle: val(f.jobTitle),
      url: val(f.url),
      email: val(f.email),
      telephone: val(f.telephone),
      image: val(f.image),
      sameAs: list(f.sameAs),
    });
  }

  if (type === "FAQPage") {
    const mainEntity = (faqs || [])
      .map((qa) => {
        const q = val(qa.q);
        const a = val(qa.a);
        if (!q || !a) return null;
        return {
          "@type": "Question",
          name: q,
          acceptedAnswer: { "@type": "Answer", text: a },
        };
      })
      .filter(Boolean);
    return clean({ ...base, mainEntity });
  }

  return base;
}

export default function SchemaGenerator() {
  const [type, setType] = useState("Organization");
  const [fields, setFields] = useState(EMPTY_FIELDS);
  const [faqs, setFaqs] = useState([
    { q: "", a: "" },
    { q: "", a: "" },
  ]);
  const [copied, setCopied] = useState(false);

  function set(key, value) {
    setFields((prev) => ({ ...prev, [key]: value }));
  }

  function setFaq(i, key, value) {
    setFaqs((prev) =>
      prev.map((qa, idx) => (idx === i ? { ...qa, [key]: value } : qa))
    );
  }

  function addFaq() {
    setFaqs((prev) => [...prev, { q: "", a: "" }]);
  }

  function removeFaq(i) {
    setFaqs((prev) =>
      prev.length > 1 ? prev.filter((_, idx) => idx !== i) : prev
    );
  }

  const schema = useMemo(
    () => buildSchema(type, fields, faqs),
    [type, fields, faqs]
  );

  const jsonBody = useMemo(() => {
    if (!schema) return "";
    try {
      // Escape "<" as <. JSON-LD is embedded inside a <script> block, so a
      // value containing "</script>" would otherwise close the tag early — and
      // the user pastes this snippet onto their own site, making it their XSS.
      // < is valid JSON and parsers read it back as a plain "<".
      return JSON.stringify(schema, null, 2).replace(/</g, "\\u003c");
    } catch (e) {
      return "";
    }
  }, [schema]);

  const output = jsonBody
    ? `<script type="application/ld+json">\n${jsonBody}\n</script>`
    : "";

  const fieldCount = schema ? countLeaves(schema) : 0;

  async function handleCopy() {
    if (!output) return;
    try {
      await navigator.clipboard.writeText(output);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleClear() {
    setFields(EMPTY_FIELDS);
    setFaqs([
      { q: "", a: "" },
      { q: "", a: "" },
    ]);
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sg-type">
            Schema type
          </label>
          <select
            className="tool-select"
            id="sg-type"
            value={type}
            onChange={(e) => {
              setType(e.target.value);
              setCopied(false);
            }}
          >
            {SCHEMA_TYPES.map((t) => (
              <option key={t.value} value={t.value}>
                {t.label}
              </option>
            ))}
          </select>
        </div>

        {/* Organization */}
        {type === "Organization" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-name">
                  Organization name
                </label>
                <input
                  className="tool-input"
                  id="sg-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Every Boring Tool"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-url">
                  Website URL
                </label>
                <input
                  className="tool-input"
                  id="sg-url"
                  type="text"
                  value={fields.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://example.com"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-logo">
                Logo URL
              </label>
              <input
                className="tool-input"
                id="sg-logo"
                type="text"
                value={fields.logo}
                onChange={(e) => set("logo", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-desc">
                Description
              </label>
              <textarea
                className="tool-textarea"
                id="sg-desc"
                value={fields.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A collection of free, privacy-friendly online tools."
                rows={2}
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-tel">
                  Telephone
                </label>
                <input
                  className="tool-input"
                  id="sg-tel"
                  type="text"
                  value={fields.telephone}
                  onChange={(e) => set("telephone", e.target.value)}
                  placeholder="+1-555-123-4567"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-email">
                  Email
                </label>
                <input
                  className="tool-input"
                  id="sg-email"
                  type="text"
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="hello@example.com"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-sameas">
                Social profile URLs (one per line or comma-separated)
              </label>
              <textarea
                className="tool-textarea"
                id="sg-sameas"
                value={fields.sameAs}
                onChange={(e) => set("sameAs", e.target.value)}
                placeholder={"https://twitter.com/yourbrand\nhttps://linkedin.com/company/yourbrand"}
                rows={2}
              />
            </div>
          </>
        )}

        {/* LocalBusiness */}
        {type === "LocalBusiness" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-name">
                  Business name
                </label>
                <input
                  className="tool-input"
                  id="sg-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Joe's Coffee House"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-url">
                  Website URL
                </label>
                <input
                  className="tool-input"
                  id="sg-url"
                  type="text"
                  value={fields.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://joescoffee.com"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-desc">
                Description
              </label>
              <textarea
                className="tool-textarea"
                id="sg-desc"
                value={fields.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Specialty coffee and fresh pastries in downtown."
                rows={2}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-street">
                Street address
              </label>
              <input
                className="tool-input"
                id="sg-street"
                type="text"
                value={fields.streetAddress}
                onChange={(e) => set("streetAddress", e.target.value)}
                placeholder="123 Main St"
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-city">
                  City
                </label>
                <input
                  className="tool-input"
                  id="sg-city"
                  type="text"
                  value={fields.addressLocality}
                  onChange={(e) => set("addressLocality", e.target.value)}
                  placeholder="Portland"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-region">
                  State / region
                </label>
                <input
                  className="tool-input"
                  id="sg-region"
                  type="text"
                  value={fields.addressRegion}
                  onChange={(e) => set("addressRegion", e.target.value)}
                  placeholder="OR"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-postal">
                  Postal code
                </label>
                <input
                  className="tool-input"
                  id="sg-postal"
                  type="text"
                  value={fields.postalCode}
                  onChange={(e) => set("postalCode", e.target.value)}
                  placeholder="97201"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-country">
                  Country
                </label>
                <input
                  className="tool-input"
                  id="sg-country"
                  type="text"
                  value={fields.addressCountry}
                  onChange={(e) => set("addressCountry", e.target.value)}
                  placeholder="US"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-tel">
                  Telephone
                </label>
                <input
                  className="tool-input"
                  id="sg-tel"
                  type="text"
                  value={fields.telephone}
                  onChange={(e) => set("telephone", e.target.value)}
                  placeholder="+1-555-123-4567"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-price">
                  Price range
                </label>
                <input
                  className="tool-input"
                  id="sg-price"
                  type="text"
                  value={fields.priceRange}
                  onChange={(e) => set("priceRange", e.target.value)}
                  placeholder="$$"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-hours">
                Opening hours (one per line, e.g. Mo-Fr 09:00-17:00)
              </label>
              <textarea
                className="tool-textarea"
                id="sg-hours"
                value={fields.openingHours}
                onChange={(e) => set("openingHours", e.target.value)}
                placeholder={"Mo-Fr 07:00-18:00\nSa-Su 08:00-14:00"}
                rows={2}
              />
            </div>
          </>
        )}

        {/* Article */}
        {type === "Article" && (
          <>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-headline">
                Headline
              </label>
              <input
                className="tool-input"
                id="sg-headline"
                type="text"
                value={fields.headline}
                onChange={(e) => set("headline", e.target.value)}
                placeholder="How to Add Structured Data to Your Site"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-desc">
                Description
              </label>
              <textarea
                className="tool-textarea"
                id="sg-desc"
                value={fields.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="A short summary of the article."
                rows={2}
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-author">
                  Author name
                </label>
                <input
                  className="tool-input"
                  id="sg-author"
                  type="text"
                  value={fields.authorName}
                  onChange={(e) => set("authorName", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-publisher">
                  Publisher name
                </label>
                <input
                  className="tool-input"
                  id="sg-publisher"
                  type="text"
                  value={fields.publisherName}
                  onChange={(e) => set("publisherName", e.target.value)}
                  placeholder="Example Media"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-image">
                Image URL(s) (comma-separated)
              </label>
              <input
                className="tool-input"
                id="sg-image"
                type="text"
                value={fields.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="https://example.com/cover.jpg"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-logo">
                Publisher logo URL
              </label>
              <input
                className="tool-input"
                id="sg-logo"
                type="text"
                value={fields.logo}
                onChange={(e) => set("logo", e.target.value)}
                placeholder="https://example.com/logo.png"
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-pub">
                  Date published
                </label>
                <input
                  className="tool-input"
                  id="sg-pub"
                  type="date"
                  value={fields.datePublished}
                  onChange={(e) => set("datePublished", e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-mod">
                  Date modified
                </label>
                <input
                  className="tool-input"
                  id="sg-mod"
                  type="date"
                  value={fields.dateModified}
                  onChange={(e) => set("dateModified", e.target.value)}
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-url">
                Article URL
              </label>
              <input
                className="tool-input"
                id="sg-url"
                type="text"
                value={fields.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://example.com/blog/structured-data"
              />
            </div>
          </>
        )}

        {/* Product */}
        {type === "Product" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-name">
                  Product name
                </label>
                <input
                  className="tool-input"
                  id="sg-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Wireless Headphones"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-brand">
                  Brand
                </label>
                <input
                  className="tool-input"
                  id="sg-brand"
                  type="text"
                  value={fields.brand}
                  onChange={(e) => set("brand", e.target.value)}
                  placeholder="Acme Audio"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-desc">
                Description
              </label>
              <textarea
                className="tool-textarea"
                id="sg-desc"
                value={fields.description}
                onChange={(e) => set("description", e.target.value)}
                placeholder="Over-ear headphones with 30-hour battery life."
                rows={2}
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-sku">
                  SKU
                </label>
                <input
                  className="tool-input"
                  id="sg-sku"
                  type="text"
                  value={fields.sku}
                  onChange={(e) => set("sku", e.target.value)}
                  placeholder="AA-HP-100"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-image">
                  Image URL(s) (comma-separated)
                </label>
                <input
                  className="tool-input"
                  id="sg-image"
                  type="text"
                  value={fields.image}
                  onChange={(e) => set("image", e.target.value)}
                  placeholder="https://example.com/headphones.jpg"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-priceval">
                  Price
                </label>
                <input
                  className="tool-input"
                  id="sg-priceval"
                  type="text"
                  inputMode="decimal"
                  value={fields.price}
                  onChange={(e) => set("price", e.target.value)}
                  placeholder="129.99"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-currency">
                  Currency
                </label>
                <input
                  className="tool-input"
                  id="sg-currency"
                  type="text"
                  value={fields.priceCurrency}
                  onChange={(e) =>
                    set("priceCurrency", e.target.value.toUpperCase())
                  }
                  placeholder="USD"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-avail">
                  Availability
                </label>
                <select
                  className="tool-select"
                  id="sg-avail"
                  value={fields.availability}
                  onChange={(e) => set("availability", e.target.value)}
                >
                  {AVAILABILITY.map((a) => (
                    <option key={a.value} value={a.value}>
                      {a.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-url">
                  Product URL
                </label>
                <input
                  className="tool-input"
                  id="sg-url"
                  type="text"
                  value={fields.url}
                  onChange={(e) => set("url", e.target.value)}
                  placeholder="https://example.com/product/headphones"
                />
              </div>
            </div>
          </>
        )}

        {/* Person */}
        {type === "Person" && (
          <>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-name">
                  Full name
                </label>
                <input
                  className="tool-input"
                  id="sg-name"
                  type="text"
                  value={fields.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="Jane Doe"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-job">
                  Job title
                </label>
                <input
                  className="tool-input"
                  id="sg-job"
                  type="text"
                  value={fields.jobTitle}
                  onChange={(e) => set("jobTitle", e.target.value)}
                  placeholder="Founder & CEO"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-url">
                Website / profile URL
              </label>
              <input
                className="tool-input"
                id="sg-url"
                type="text"
                value={fields.url}
                onChange={(e) => set("url", e.target.value)}
                placeholder="https://janedoe.com"
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-email">
                  Email
                </label>
                <input
                  className="tool-input"
                  id="sg-email"
                  type="text"
                  value={fields.email}
                  onChange={(e) => set("email", e.target.value)}
                  placeholder="jane@example.com"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="sg-tel">
                  Telephone
                </label>
                <input
                  className="tool-input"
                  id="sg-tel"
                  type="text"
                  value={fields.telephone}
                  onChange={(e) => set("telephone", e.target.value)}
                  placeholder="+1-555-123-4567"
                />
              </div>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-image">
                Photo URL
              </label>
              <input
                className="tool-input"
                id="sg-image"
                type="text"
                value={fields.image}
                onChange={(e) => set("image", e.target.value)}
                placeholder="https://example.com/jane.jpg"
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="sg-sameas">
                Social profile URLs (one per line or comma-separated)
              </label>
              <textarea
                className="tool-textarea"
                id="sg-sameas"
                value={fields.sameAs}
                onChange={(e) => set("sameAs", e.target.value)}
                placeholder={"https://twitter.com/janedoe\nhttps://linkedin.com/in/janedoe"}
                rows={2}
              />
            </div>
          </>
        )}

        {/* FAQPage */}
        {type === "FAQPage" && (
          <>
            {faqs.map((qa, i) => (
              <div className="tool-field" key={i}>
                <label className="tool-label" htmlFor={`sg-q-${i}`}>
                  Question {i + 1}
                </label>
                <input
                  className="tool-input"
                  id={`sg-q-${i}`}
                  type="text"
                  value={qa.q}
                  onChange={(e) => setFaq(i, "q", e.target.value)}
                  placeholder="Is this tool free?"
                />
                <label className="tool-label" htmlFor={`sg-a-${i}`}>
                  Answer {i + 1}
                </label>
                <textarea
                  className="tool-textarea"
                  id={`sg-a-${i}`}
                  value={qa.a}
                  onChange={(e) => setFaq(i, "a", e.target.value)}
                  placeholder="Yes, it is completely free to use."
                  rows={2}
                />
                {faqs.length > 1 && (
                  <div className="tool-actions">
                    <button
                      className="btn"
                      type="button"
                      onClick={() => removeFaq(i)}
                    >
                      Remove question {i + 1}
                    </button>
                  </div>
                )}
              </div>
            ))}
            <div className="tool-actions">
              <button className="btn" type="button" onClick={addFaq}>
                Add question
              </button>
            </div>
          </>
        )}
      </div>

      {fieldCount > 0 ? (
        <div className="tool-stat-grid" role="status" aria-live="polite">
          <div className="tool-stat">
            <div className="tool-stat-num">{type}</div>
            <div className="tool-stat-label">schema type</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{fieldCount}</div>
            <div className="tool-stat-label">fields filled</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">
              {jsonBody ? jsonBody.split("\n").length : 0}
            </div>
            <div className="tool-stat-label">lines of JSON-LD</div>
          </div>
        </div>
      ) : null}

      {output ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy JSON-LD"}
            </button>
            <button className="btn" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>
          <label className="tool-label" htmlFor="sg-output">
            Generated JSON-LD
          </label>
          <pre className="tool-output" id="sg-output">
            {output}
          </pre>
          <p className="tool-note">
            Paste this snippet inside the &lt;head&gt; of your page. Google reads
            JSON-LD in either the head or body. Validate it with the Rich Results
            Test before publishing.
          </p>
        </div>
      ) : (
        <p className="tool-note">
          Fill in at least one field above and your JSON-LD structured data will
          appear here instantly, ready to copy into your page.
        </p>
      )}
    </div>
  );
}

// Count filled leaf values (ignores @context / @type keys) for the stat.
function countLeaves(obj) {
  let n = 0;
  for (const key of Object.keys(obj)) {
    if (key === "@context" || key === "@type") continue;
    const v = obj[key];
    if (v == null) continue;
    if (Array.isArray(v)) {
      for (const item of v) {
        n += item && typeof item === "object" ? countLeaves(item) : 1;
      }
    } else if (typeof v === "object") {
      n += countLeaves(v);
    } else {
      n += 1;
    }
  }
  return n;
}
