"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Common schema.org LocalBusiness subtypes. Falls back to "LocalBusiness".
const BUSINESS_TYPES = [
  "LocalBusiness",
  "Restaurant",
  "CafeOrCoffeeShop",
  "Bakery",
  "BarOrPub",
  "Store",
  "GroceryStore",
  "ClothingStore",
  "HardwareStore",
  "FurnitureStore",
  "JewelryStore",
  "ElectronicsStore",
  "AutoRepair",
  "AutoDealer",
  "GasStation",
  "HairSalon",
  "BeautySalon",
  "NailSalon",
  "DaySpa",
  "HealthClub",
  "Gym",
  "Physician",
  "Dentist",
  "MedicalClinic",
  "VeterinaryCare",
  "Optician",
  "Pharmacy",
  "LegalService",
  "Attorney",
  "Notary",
  "AccountingService",
  "FinancialService",
  "InsuranceAgency",
  "RealEstateAgent",
  "Plumber",
  "Electrician",
  "HVACBusiness",
  "RoofingContractor",
  "MovingCompany",
  "HousePainter",
  "Locksmith",
  "GeneralContractor",
  "Hotel",
  "LodgingBusiness",
  "TravelAgency",
  "ChildCare",
  "DryCleaningOrLaundry",
  "PetStore",
  "ProfessionalService",
];

const DAYS = [
  { key: "Monday", label: "Mon" },
  { key: "Tuesday", label: "Tue" },
  { key: "Wednesday", label: "Wed" },
  { key: "Thursday", label: "Thu" },
  { key: "Friday", label: "Fri" },
  { key: "Saturday", label: "Sat" },
  { key: "Sunday", label: "Sun" },
];

function defaultHours() {
  const h = {};
  for (const d of DAYS) {
    const weekend = d.key === "Saturday" || d.key === "Sunday";
    h[d.key] = {
      closed: d.key === "Sunday",
      open: weekend ? "10:00" : "09:00",
      close: weekend ? "16:00" : "17:00",
    };
  }
  return h;
}

// Group consecutive days that share the same open/close into ranges so the
// output uses compact OpeningHoursSpecification blocks like Google's examples.
function buildOpeningHours(hours) {
  const specs = [];
  let run = null;
  for (const d of DAYS) {
    const h = hours[d.key];
    if (h.closed || !h.open || !h.close) {
      if (run) {
        specs.push(run);
        run = null;
      }
      continue;
    }
    if (run && run.open === h.open && run.close === h.close) {
      run.days.push(d.key);
    } else {
      if (run) specs.push(run);
      run = { days: [d.key], open: h.open, close: h.close };
    }
  }
  if (run) specs.push(run);

  return specs.map((s) => ({
    "@type": "OpeningHoursSpecification",
    dayOfWeek:
      s.days.length === 1
        ? "https://schema.org/" + s.days[0]
        : s.days.map((d) => "https://schema.org/" + d),
    opens: s.open,
    closes: s.close,
  }));
}

function buildSchema(f) {
  const schema = {
    "@context": "https://schema.org",
    "@type": f.type || "LocalBusiness",
  };

  if (f.name.trim()) schema.name = f.name.trim();
  if (f.description.trim()) schema.description = f.description.trim();
  if (f.image.trim()) schema.image = f.image.trim();
  if (f.url.trim()) schema.url = f.url.trim();
  if (f.telephone.trim()) schema.telephone = f.telephone.trim();
  if (f.email.trim()) schema.email = f.email.trim();
  if (f.priceRange.trim()) schema.priceRange = f.priceRange.trim();

  const addr = {};
  if (f.street.trim()) addr.streetAddress = f.street.trim();
  if (f.city.trim()) addr.addressLocality = f.city.trim();
  if (f.region.trim()) addr.addressRegion = f.region.trim();
  if (f.postal.trim()) addr.postalCode = f.postal.trim();
  if (f.country.trim()) addr.addressCountry = f.country.trim();
  if (Object.keys(addr).length) {
    addr["@type"] = "PostalAddress";
    // Put @type first for readability.
    schema.address = { "@type": "PostalAddress", ...addr };
  }

  const lat = parseFloat(f.lat);
  const lng = parseFloat(f.lng);
  if (!Number.isNaN(lat) && !Number.isNaN(lng)) {
    schema.geo = {
      "@type": "GeoCoordinates",
      latitude: lat,
      longitude: lng,
    };
  }

  const hoursSpec = buildOpeningHours(f.hours);
  if (hoursSpec.length) schema.openingHoursSpecification = hoursSpec;

  const sameAs = f.sameAs
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean);
  if (sameAs.length) schema.sameAs = sameAs;

  return schema;
}

function validate(f, schema) {
  const errors = [];
  const warnings = [];

  if (!f.name.trim()) errors.push("Business name is required by Google for LocalBusiness markup.");

  const hasAddress =
    f.street.trim() || f.city.trim() || f.region.trim() || f.postal.trim() || f.country.trim();
  if (!hasAddress) {
    errors.push("Add at least a street, city, or postal code — LocalBusiness needs an address.");
  } else {
    if (!f.street.trim()) warnings.push("Street address is missing. Google recommends the full street address.");
    if (!f.city.trim()) warnings.push("City (addressLocality) is missing.");
    if (!f.country.trim()) warnings.push("Country code is missing (e.g. US, GB, CA).");
  }

  if (!f.telephone.trim()) warnings.push("A phone number helps Google verify and display the business.");
  if (!f.url.trim()) warnings.push("A website URL is recommended.");
  if (!f.image.trim()) warnings.push("An image URL is recommended for rich results.");

  if (f.url.trim() && !/^https?:\/\//i.test(f.url.trim())) {
    warnings.push("Website URL should start with http:// or https://.");
  }
  if (f.image.trim() && !/^https?:\/\//i.test(f.image.trim())) {
    warnings.push("Image should be a full URL starting with http:// or https://.");
  }
  if (f.priceRange.trim() && f.priceRange.trim().length > 10) {
    warnings.push('priceRange is usually short, like "$$" or "$10-$30".');
  }

  const lat = f.lat.trim();
  const lng = f.lng.trim();
  if ((lat && !lng) || (lng && !lat)) {
    warnings.push("Latitude and longitude should be provided together.");
  } else if (lat && lng) {
    const la = parseFloat(lat);
    const ln = parseFloat(lng);
    if (Number.isNaN(la) || la < -90 || la > 90) warnings.push("Latitude should be a number between -90 and 90.");
    if (Number.isNaN(ln) || ln < -180 || ln > 180) warnings.push("Longitude should be a number between -180 and 180.");
  }

  return { errors, warnings };
}

const EXAMPLE = {
  type: "Restaurant",
  name: "Corner Slice Pizzeria",
  description: "Wood-fired Neapolitan pizza and craft sodas in downtown Springfield.",
  image: "https://example.com/photos/storefront.jpg",
  url: "https://cornerslice.example.com",
  telephone: "+1-217-555-0143",
  email: "hello@cornerslice.example.com",
  priceRange: "$$",
  street: "128 Main Street",
  city: "Springfield",
  region: "IL",
  postal: "62701",
  country: "US",
  lat: "39.799372",
  lng: "-89.644554",
  sameAs: "https://www.facebook.com/cornerslice\nhttps://www.instagram.com/cornerslice",
};

export default function SchemaLocalBusinessGenerator() {
  const [f, setF] = useState({ ...EXAMPLE, hours: defaultHours() });
  const [copied, setCopied] = useState(false);

  function set(key, value) {
    setF((prev) => ({ ...prev, [key]: value }));
    setCopied(false);
  }

  function setHour(day, patch) {
    setF((prev) => ({
      ...prev,
      hours: { ...prev.hours, [day]: { ...prev.hours[day], ...patch } },
    }));
    setCopied(false);
  }

  const schema = useMemo(() => buildSchema(f), [f]);
  const { errors, warnings } = useMemo(() => validate(f, schema), [f, schema]);

  const jsonLd = useMemo(() => JSON.stringify(schema, null, 2), [schema]);
  const scriptTag = useMemo(
    () => '<script type="application/ld+json">\n' + jsonLd + "\n</script>",
    [jsonLd]
  );

  const fieldCount = useMemo(() => {
    // Count top-level properties excluding @context/@type.
    return Object.keys(schema).filter((k) => k !== "@context" && k !== "@type").length;
  }, [schema]);

  async function handleCopy() {
    try {
      await copyText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([scriptTag], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "localbusiness-schema.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  function handleReset() {
    setF({ ...EXAMPLE, hours: defaultHours() });
    setCopied(false);
  }

  function handleClear() {
    setF({
      type: "LocalBusiness",
      name: "",
      description: "",
      image: "",
      url: "",
      telephone: "",
      email: "",
      priceRange: "",
      street: "",
      city: "",
      region: "",
      postal: "",
      country: "",
      lat: "",
      lng: "",
      sameAs: "",
      hours: defaultHours(),
    });
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-type">
              Business type
            </label>
            <select
              className="tool-select"
              id="lb-type"
              value={f.type}
              onChange={(e) => set("type", e.target.value)}
            >
              {BUSINESS_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-name">
              Business name
            </label>
            <input
              className="tool-input"
              id="lb-name"
              type="text"
              value={f.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="Corner Slice Pizzeria"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="lb-desc">
            Description
          </label>
          <textarea
            className="tool-textarea"
            id="lb-desc"
            rows={2}
            value={f.description}
            onChange={(e) => set("description", e.target.value)}
            placeholder="What the business does, in one or two sentences."
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-url">
              Website URL
            </label>
            <input
              className="tool-input"
              id="lb-url"
              type="text"
              value={f.url}
              onChange={(e) => set("url", e.target.value)}
              placeholder="https://example.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-image">
              Image URL
            </label>
            <input
              className="tool-input"
              id="lb-image"
              type="text"
              value={f.image}
              onChange={(e) => set("image", e.target.value)}
              placeholder="https://example.com/photo.jpg"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-tel">
              Telephone
            </label>
            <input
              className="tool-input"
              id="lb-tel"
              type="text"
              value={f.telephone}
              onChange={(e) => set("telephone", e.target.value)}
              placeholder="+1-217-555-0143"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-email">
              Email
            </label>
            <input
              className="tool-input"
              id="lb-email"
              type="text"
              value={f.email}
              onChange={(e) => set("email", e.target.value)}
              placeholder="hello@example.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-price">
              Price range
            </label>
            <input
              className="tool-input"
              id="lb-price"
              type="text"
              value={f.priceRange}
              onChange={(e) => set("priceRange", e.target.value)}
              placeholder="$$"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="lb-street">
            Street address
          </label>
          <input
            className="tool-input"
            id="lb-street"
            type="text"
            value={f.street}
            onChange={(e) => set("street", e.target.value)}
            placeholder="128 Main Street"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-city">
              City
            </label>
            <input
              className="tool-input"
              id="lb-city"
              type="text"
              value={f.city}
              onChange={(e) => set("city", e.target.value)}
              placeholder="Springfield"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-region">
              State / region
            </label>
            <input
              className="tool-input"
              id="lb-region"
              type="text"
              value={f.region}
              onChange={(e) => set("region", e.target.value)}
              placeholder="IL"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-postal">
              Postal code
            </label>
            <input
              className="tool-input"
              id="lb-postal"
              type="text"
              value={f.postal}
              onChange={(e) => set("postal", e.target.value)}
              placeholder="62701"
              autoComplete="off"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-country">
              Country code
            </label>
            <input
              className="tool-input"
              id="lb-country"
              type="text"
              value={f.country}
              onChange={(e) => set("country", e.target.value)}
              placeholder="US"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-lat">
              Latitude (optional)
            </label>
            <input
              className="tool-input"
              id="lb-lat"
              type="text"
              value={f.lat}
              onChange={(e) => set("lat", e.target.value)}
              placeholder="39.799372"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-lng">
              Longitude (optional)
            </label>
            <input
              className="tool-input"
              id="lb-lng"
              type="text"
              value={f.lng}
              onChange={(e) => set("lng", e.target.value)}
              placeholder="-89.644554"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label">Opening hours</label>
          {DAYS.map((d) => {
            const h = f.hours[d.key];
            return (
              <div className="tool-row" key={d.key} style={{ alignItems: "center" }}>
                <div className="tool-field" style={{ maxWidth: 130 }}>
                  <label className="tool-label" htmlFor={"lb-closed-" + d.key}>
                    <input
                      id={"lb-closed-" + d.key}
                      type="checkbox"
                      checked={!h.closed}
                      onChange={(e) => setHour(d.key, { closed: !e.target.checked })}
                      style={{ marginRight: 8, verticalAlign: "middle" }}
                    />
                    {d.key}
                  </label>
                </div>
                {!h.closed ? (
                  <>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor={"lb-open-" + d.key}>
                        Opens
                      </label>
                      <input
                        className="tool-input"
                        id={"lb-open-" + d.key}
                        type="time"
                        value={h.open}
                        onChange={(e) => setHour(d.key, { open: e.target.value })}
                      />
                    </div>
                    <div className="tool-field">
                      <label className="tool-label" htmlFor={"lb-close-" + d.key}>
                        Closes
                      </label>
                      <input
                        className="tool-input"
                        id={"lb-close-" + d.key}
                        type="time"
                        value={h.close}
                        onChange={(e) => setHour(d.key, { close: e.target.value })}
                      />
                    </div>
                  </>
                ) : (
                  <div className="tool-field">
                    <span className="tool-note">Closed</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="lb-sameas">
            Social / profile URLs (one per line)
          </label>
          <textarea
            className="tool-textarea"
            id="lb-sameas"
            rows={3}
            value={f.sameAs}
            onChange={(e) => set("sameAs", e.target.value)}
            placeholder={"https://www.facebook.com/yourpage\nhttps://www.instagram.com/yourpage"}
            spellCheck={false}
          />
          <p className="tool-note">
            These become the schema&apos;s sameAs list — links to your official profiles that help
            Google connect your listings.
          </p>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className={copied ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy script tag"}
        </button>
        <button className="btn" type="button" onClick={handleDownload}>
          Download .html
        </button>
        <button className="btn" type="button" onClick={handleReset}>
          Load example
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear all
        </button>
      </div>

      {errors.length ? (
        <div className="tool-error">
          {errors.map((e, i) => (
            <div key={i}>• {e}</div>
          ))}
        </div>
      ) : null}

      <div className="tool-stat-grid" role="status" aria-live="polite">
        <div className="tool-stat">
          <div className="tool-stat-num">{fieldCount}</div>
          <div className="tool-stat-label">properties</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">
            {schema.openingHoursSpecification ? schema.openingHoursSpecification.length : 0}
          </div>
          <div className="tool-stat-label">hours blocks</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{errors.length ? "No" : "Yes"}</div>
          <div className="tool-stat-label">ready to paste</div>
        </div>
      </div>

      <div className="tool-field">
        <label className="tool-label" htmlFor="lb-output">
          JSON-LD script tag
        </label>
        <pre className="tool-output" id="lb-output" role="status" aria-live="polite">
          {scriptTag}
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
        Paste the whole &lt;script&gt; block into the &lt;head&gt; (or anywhere in the &lt;body&gt;)
        of the page for this business — usually the homepage or a contact page. Use one
        LocalBusiness block per physical location. After it&apos;s live, check it with Google&apos;s
        Rich Results Test. Everything here runs in your browser; nothing is uploaded.
      </p>
    </div>
  );
}
