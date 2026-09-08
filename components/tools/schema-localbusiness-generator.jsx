"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// A focused set of the most common schema.org LocalBusiness subtypes.
// Using a specific subtype (e.g. Restaurant) is better for rich results than
// the generic "LocalBusiness" when one fits.
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
  "JewelryStore",
  "FurnitureStore",
  "AutoRepair",
  "AutomotiveBusiness",
  "GasStation",
  "BeautySalon",
  "HairSalon",
  "NailSalon",
  "DaySpa",
  "HealthAndBeautyBusiness",
  "MedicalClinic",
  "Dentist",
  "Physician",
  "VeterinaryCare",
  "LegalService",
  "Attorney",
  "AccountingService",
  "FinancialService",
  "InsuranceAgency",
  "RealEstateAgent",
  "HomeAndConstructionBusiness",
  "Electrician",
  "Plumber",
  "HVACBusiness",
  "RoofingContractor",
  "GeneralContractor",
  "Locksmith",
  "MovingCompany",
  "HousePainter",
  "Gym",
  "SportsActivityLocation",
  "ProfessionalService",
  "ChildCare",
  "Florist",
  "PetStore",
  "DryCleaningOrLaundry",
  "TravelAgency",
  "Hotel",
  "Lodging",
  "EntertainmentBusiness",
];

const DAYS = [
  { key: "Monday", short: "Mon" },
  { key: "Tuesday", short: "Tue" },
  { key: "Wednesday", short: "Wed" },
  { key: "Thursday", short: "Thu" },
  { key: "Friday", short: "Fri" },
  { key: "Saturday", short: "Sat" },
  { key: "Sunday", short: "Sun" },
];

function emptyHours() {
  const h = {};
  DAYS.forEach((d) => {
    h[d.key] = { open: "09:00", close: "17:00", closed: false };
  });
  // Sensible default: closed Sunday.
  h.Sunday.closed = true;
  return h;
}

// Group consecutive same-hours days into compact OpeningHoursSpecification entries.
function buildOpeningHours(hours) {
  const specs = [];
  DAYS.forEach((d) => {
    const day = hours[d.key];
    if (!day || day.closed) return;
    if (!day.open || !day.close) return;
    const last = specs[specs.length - 1];
    if (last && last.opens === day.open && last.closes === day.close) {
      last.dayOfWeek.push(d.key);
    } else {
      specs.push({
        "@type": "OpeningHoursSpecification",
        dayOfWeek: [d.key],
        opens: day.open,
        closes: day.close,
      });
    }
  });
  return specs;
}

function isValidUrl(raw) {
  const v = String(raw || "").trim();
  if (!v) return true; // optional
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:";
  } catch (e) {
    return false;
  }
}

export default function SchemaLocalBusinessGenerator() {
  const [type, setType] = useState("LocalBusiness");
  const [name, setName] = useState("Sunrise Bakery");
  const [description, setDescription] = useState(
    "Family-owned bakery serving fresh bread, cakes, and pastries daily."
  );
  const [url, setUrl] = useState("https://www.sunrisebakery.com");
  const [phone, setPhone] = useState("+1-415-555-0123");
  const [priceRange, setPriceRange] = useState("$$");
  const [image, setImage] = useState(
    "https://www.sunrisebakery.com/storefront.jpg"
  );

  const [street, setStreet] = useState("123 Market Street");
  const [locality, setLocality] = useState("San Francisco");
  const [region, setRegion] = useState("CA");
  const [postal, setPostal] = useState("94103");
  const [country, setCountry] = useState("US");

  const [lat, setLat] = useState("37.7749");
  const [lng, setLng] = useState("-122.4194");

  const [hours, setHours] = useState(emptyHours);
  const [copied, setCopied] = useState(false);

  function updateHour(dayKey, field, value) {
    setHours((prev) => ({
      ...prev,
      [dayKey]: { ...prev[dayKey], [field]: value },
    }));
  }

  const errors = useMemo(() => {
    const errs = [];
    if (!name.trim()) errs.push("Business name is required.");
    if (!isValidUrl(url)) errs.push("Website URL must start with http:// or https://");
    if (!isValidUrl(image)) errs.push("Image URL must start with http:// or https://");
    if ((lat.trim() && !lng.trim()) || (!lat.trim() && lng.trim())) {
      errs.push("Enter both latitude and longitude, or leave both blank.");
    }
    if (lat.trim() && (isNaN(Number(lat)) || Number(lat) < -90 || Number(lat) > 90)) {
      errs.push("Latitude must be a number between -90 and 90.");
    }
    if (lng.trim() && (isNaN(Number(lng)) || Number(lng) < -180 || Number(lng) > 180)) {
      errs.push("Longitude must be a number between -180 and 180.");
    }
    return errs;
  }, [name, url, image, lat, lng]);

  const schemaObject = useMemo(() => {
    if (!name.trim()) return null;

    const obj = {
      "@context": "https://schema.org",
      "@type": type,
      name: name.trim(),
    };

    if (image.trim()) obj.image = image.trim();
    if (description.trim()) obj.description = description.trim();
    if (url.trim()) obj.url = url.trim();
    if (phone.trim()) obj.telephone = phone.trim();
    if (priceRange.trim()) obj.priceRange = priceRange.trim();

    const addr = {};
    if (street.trim()) addr.streetAddress = street.trim();
    if (locality.trim()) addr.addressLocality = locality.trim();
    if (region.trim()) addr.addressRegion = region.trim();
    if (postal.trim()) addr.postalCode = postal.trim();
    if (country.trim()) addr.addressCountry = country.trim();
    if (Object.keys(addr).length) {
      obj.address = { "@type": "PostalAddress", ...addr };
    }

    if (lat.trim() && lng.trim() && !isNaN(Number(lat)) && !isNaN(Number(lng))) {
      obj.geo = {
        "@type": "GeoCoordinates",
        latitude: Number(lat),
        longitude: Number(lng),
      };
    }

    const openingHours = buildOpeningHours(hours);
    if (openingHours.length) obj.openingHoursSpecification = openingHours;

    return obj;
  }, [
    type,
    name,
    image,
    description,
    url,
    phone,
    priceRange,
    street,
    locality,
    region,
    postal,
    country,
    lat,
    lng,
    hours,
  ]);

  const jsonLd = useMemo(() => {
    if (!schemaObject) return "";
    return JSON.stringify(schemaObject, null, 2);
  }, [schemaObject]);

  const scriptTag = useMemo(() => {
    if (!jsonLd) return "";
    return '<script type="application/ld+json">\n' + jsonLd + "\n</script>";
  }, [jsonLd]);

  const fieldCount = schemaObject
    ? Object.keys(schemaObject).filter((k) => k !== "@context" && k !== "@type").length
    : 0;
  const openDays = useMemo(
    () => DAYS.filter((d) => !hours[d.key].closed).length,
    [hours]
  );

  async function handleCopy() {
    if (!scriptTag) return;
    try {
      await copyText(scriptTag);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    if (!scriptTag) return;
    const blob = new Blob([scriptTag], { type: "text/html;charset=utf-8" });
    const dlUrl = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = dlUrl;
    a.download = "localbusiness-schema.html";
    a.click();
    URL.revokeObjectURL(dlUrl);
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
              value={type}
              onChange={(e) => setType(e.target.value)}
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
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Sunrise Bakery"
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
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Short summary of what the business does"
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
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://example.com"
              autoComplete="off"
              spellCheck={false}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-phone">
              Phone
            </label>
            <input
              className="tool-input"
              id="lb-phone"
              type="text"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1-415-555-0123"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-image">
              Image URL
            </label>
            <input
              className="tool-input"
              id="lb-image"
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/photo.jpg"
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
              value={priceRange}
              onChange={(e) => setPriceRange(e.target.value)}
              placeholder="$$"
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
            value={street}
            onChange={(e) => setStreet(e.target.value)}
            placeholder="123 Market Street"
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
              value={locality}
              onChange={(e) => setLocality(e.target.value)}
              placeholder="San Francisco"
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
              value={region}
              onChange={(e) => setRegion(e.target.value)}
              placeholder="CA"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lb-postal">
              Postal code
            </label>
            <input
              className="tool-input"
              id="lb-postal"
              type="text"
              value={postal}
              onChange={(e) => setPostal(e.target.value)}
              placeholder="94103"
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
              value={country}
              onChange={(e) => setCountry(e.target.value)}
              placeholder="US"
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
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              placeholder="37.7749"
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
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              placeholder="-122.4194"
            />
          </div>
        </div>

        <div className="tool-field">
          <span className="tool-label">Opening hours</span>
          {DAYS.map((d) => {
            const day = hours[d.key];
            return (
              <div className="tool-row" key={d.key} style={{ alignItems: "center" }}>
                <div className="tool-field" style={{ maxWidth: 150 }}>
                  <label
                    className="tool-label"
                    htmlFor={`lb-closed-${d.key}`}
                    style={{ fontWeight: 400 }}
                  >
                    <input
                      id={`lb-closed-${d.key}`}
                      type="checkbox"
                      checked={!day.closed}
                      onChange={(e) => updateHour(d.key, "closed", !e.target.checked)}
                      style={{ marginRight: 8, verticalAlign: "middle" }}
                    />
                    {d.key}
                  </label>
                </div>
                {!day.closed ? (
                  <>
                    <div className="tool-field">
                      <label
                        className="tool-label"
                        htmlFor={`lb-open-${d.key}`}
                        style={{ fontWeight: 400 }}
                      >
                        Opens
                      </label>
                      <input
                        className="tool-input"
                        id={`lb-open-${d.key}`}
                        type="time"
                        value={day.open}
                        onChange={(e) => updateHour(d.key, "open", e.target.value)}
                      />
                    </div>
                    <div className="tool-field">
                      <label
                        className="tool-label"
                        htmlFor={`lb-close-${d.key}`}
                        style={{ fontWeight: 400 }}
                      >
                        Closes
                      </label>
                      <input
                        className="tool-input"
                        id={`lb-close-${d.key}`}
                        type="time"
                        value={day.close}
                        onChange={(e) => updateHour(d.key, "close", e.target.value)}
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
      </div>

      {errors.length ? (
        <div className="tool-error">
          {errors.map((e, i) => (
            <div key={i}>{e}</div>
          ))}
        </div>
      ) : null}

      {scriptTag ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{fieldCount}</div>
              <div className="tool-stat-label">properties</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{openDays}</div>
              <div className="tool-stat-label">open days</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{jsonLd.length}</div>
              <div className="tool-stat-label">characters</div>
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
                Download .html
              </button>
            </div>
            <label className="tool-label" htmlFor="lb-output">
              JSON-LD script tag
            </label>
            <pre className="tool-output" id="lb-output" role="status" aria-live="polite">
              {scriptTag}
            </pre>
          </div>

          <p className="tool-note">
            Paste this whole &lt;script&gt; block into the &lt;head&gt; (or anywhere in
            the &lt;body&gt;) of your business&apos;s page. Use one LocalBusiness block
            per physical location. After publishing, test the URL in Google&apos;s Rich
            Results Test and the Schema.org validator to confirm it&apos;s picked up.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Fill in your business name to generate a valid schema.org LocalBusiness
          JSON-LD snippet. Everything runs privately in your browser — nothing is
          uploaded.
        </p>
      )}
    </div>
  );
}
