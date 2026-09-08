"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Build an ISO 8601 string with offset from a datetime-local value + offset.
// dtLocal looks like "2026-10-15T19:00"; offset like "-04:00" or "" (none).
function toIso(dtLocal, offset) {
  if (!dtLocal) return "";
  const off = String(offset || "").trim();
  return off ? dtLocal + off : dtLocal;
}

// Prune empty strings, empty arrays and empty objects recursively so the
// emitted JSON-LD only contains properties the user actually filled in.
function prune(value) {
  if (Array.isArray(value)) {
    const arr = value.map(prune).filter((v) => v !== undefined);
    return arr.length ? arr : undefined;
  }
  if (value && typeof value === "object") {
    const out = {};
    let has = false;
    for (const k of Object.keys(value)) {
      const v = prune(value[k]);
      if (v !== undefined) {
        out[k] = v;
        has = true;
      }
    }
    return has ? out : undefined;
  }
  if (typeof value === "string") {
    const t = value.trim();
    return t === "" ? undefined : t;
  }
  return value;
}

const ATTENDANCE = {
  offline: "https://schema.org/OfflineEventAttendanceMode",
  online: "https://schema.org/OnlineEventAttendanceMode",
  mixed: "https://schema.org/MixedEventAttendanceMode",
};

const STATUS = {
  scheduled: "https://schema.org/EventScheduled",
  cancelled: "https://schema.org/EventCancelled",
  postponed: "https://schema.org/EventPostponed",
  rescheduled: "https://schema.org/EventRescheduled",
  moved: "https://schema.org/EventMovedOnline",
};

const AVAILABILITY = {
  instock: "https://schema.org/InStock",
  soldout: "https://schema.org/SoldOut",
  preorder: "https://schema.org/PreOrder",
};

export default function SchemaEventGenerator() {
  const [name, setName] = useState("Autumn Tech Conference 2026");
  const [description, setDescription] = useState(
    "A one-day conference on modern web tooling, with talks, workshops and networking."
  );
  const [startDate, setStartDate] = useState("2026-10-15T09:00");
  const [endDate, setEndDate] = useState("2026-10-15T17:00");
  const [offset, setOffset] = useState("-04:00");
  const [attendance, setAttendance] = useState("offline");
  const [status, setStatus] = useState("scheduled");
  const [eventUrl, setEventUrl] = useState("https://example.com/events/autumn-tech");
  const [image, setImage] = useState("https://example.com/images/autumn-tech.jpg");

  // Physical location
  const [venueName, setVenueName] = useState("Downtown Convention Center");
  const [street, setStreet] = useState("120 Main Street");
  const [city, setCity] = useState("Boston");
  const [region, setRegion] = useState("MA");
  const [postal, setPostal] = useState("02110");
  const [country, setCountry] = useState("US");

  // Virtual location
  const [virtualUrl, setVirtualUrl] = useState("");

  // Offers
  const [price, setPrice] = useState("49");
  const [currency, setCurrency] = useState("USD");
  const [availability, setAvailability] = useState("instock");
  const [ticketUrl, setTicketUrl] = useState("https://example.com/events/autumn-tech/tickets");
  const [validFrom, setValidFrom] = useState("2026-08-01T10:00");

  // Organizer & performer
  const [organizer, setOrganizer] = useState("Example Events Co.");
  const [organizerUrl, setOrganizerUrl] = useState("https://example.com");
  const [performer, setPerformer] = useState("");

  const [copied, setCopied] = useState(false);

  const showPhysical = attendance === "offline" || attendance === "mixed";
  const showVirtual = attendance === "online" || attendance === "mixed";

  const { json, warnings, hasName } = useMemo(() => {
    const warn = [];
    const obj = {
      "@context": "https://schema.org",
      "@type": "Event",
      name: name,
      description: description,
      startDate: toIso(startDate, offset),
      endDate: toIso(endDate, offset),
      eventAttendanceMode: ATTENDANCE[attendance],
      eventStatus: STATUS[status],
      url: eventUrl,
      image: image ? [image] : undefined,
    };

    const locations = [];
    if (showPhysical) {
      locations.push({
        "@type": "Place",
        name: venueName,
        address: {
          "@type": "PostalAddress",
          streetAddress: street,
          addressLocality: city,
          addressRegion: region,
          postalCode: postal,
          addressCountry: country,
        },
      });
    }
    if (showVirtual) {
      locations.push({
        "@type": "VirtualLocation",
        url: virtualUrl,
      });
    }
    if (locations.length === 1) obj.location = locations[0];
    else if (locations.length > 1) obj.location = locations;

    // Offers
    const offer = {
      "@type": "Offer",
      price: price,
      priceCurrency: currency,
      availability: AVAILABILITY[availability],
      url: ticketUrl,
      validFrom: toIso(validFrom, offset),
    };
    const prunedOffer = prune(offer);
    // Only attach an Offer if it has more than just @type.
    if (prunedOffer && Object.keys(prunedOffer).length > 1) {
      obj.offers = prunedOffer;
    }

    // Organizer
    const org = { "@type": "Organization", name: organizer, url: organizerUrl };
    const prunedOrg = prune(org);
    if (prunedOrg && Object.keys(prunedOrg).length > 1) {
      obj.organizer = prunedOrg;
    }

    // Performer(s) — comma-separated list of people/acts.
    const perfNames = performer
      .split(",")
      .map((p) => p.trim())
      .filter(Boolean);
    if (perfNames.length === 1) {
      obj.performer = { "@type": "PerformingGroup", name: perfNames[0] };
    } else if (perfNames.length > 1) {
      obj.performer = perfNames.map((p) => ({
        "@type": "PerformingGroup",
        name: p,
      }));
    }

    const cleaned = prune(obj) || {};
    // Always keep the context/type even if user cleared everything.
    cleaned["@context"] = "https://schema.org";
    cleaned["@type"] = "Event";

    // Google Rich Results validation hints.
    if (!cleaned.name) warn.push("Add an event name — it is required by Google.");
    if (!cleaned.startDate)
      warn.push("Add a start date — it is required by Google.");
    if (!cleaned.location)
      warn.push(
        showVirtual
          ? "Add the virtual event URL under location."
          : "Add a location — required for in-person events."
      );
    if (showVirtual && !virtualUrl.trim())
      warn.push("Online events need a VirtualLocation URL where people attend.");
    if (!cleaned.image)
      warn.push("An image is recommended and improves rich-result eligibility.");
    if (cleaned.startDate && cleaned.endDate) {
      const s = new Date(toIso(startDate, offset));
      const e = new Date(toIso(endDate, offset));
      if (!isNaN(s) && !isNaN(e) && e < s)
        warn.push("End date is before the start date — check your times.");
    }
    if (cleaned.offers && !obj.offers.priceCurrency && obj.offers.price)
      warn.push("You set a price but no currency.");

    const script =
      '<script type="application/ld+json">\n' +
      JSON.stringify(cleaned, null, 2) +
      "\n</script>";

    return { json: script, warnings: warn, hasName: !!cleaned.name };
  }, [
    name,
    description,
    startDate,
    endDate,
    offset,
    attendance,
    status,
    eventUrl,
    image,
    showPhysical,
    showVirtual,
    venueName,
    street,
    city,
    region,
    postal,
    country,
    virtualUrl,
    price,
    currency,
    availability,
    ticketUrl,
    validFrom,
    organizer,
    organizerUrl,
    performer,
  ]);

  async function handleCopy() {
    try {
      await copyText(json);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleDownload() {
    const blob = new Blob([json], { type: "text/html" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "event-schema.html";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ev-name">
            Event name
          </label>
          <input
            className="tool-input"
            id="ev-name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Autumn Tech Conference 2026"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ev-desc">
            Description
          </label>
          <textarea
            className="tool-textarea"
            id="ev-desc"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="What the event is about"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-start">
              Start date &amp; time
            </label>
            <input
              className="tool-input"
              id="ev-start"
              type="datetime-local"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-end">
              End date &amp; time
            </label>
            <input
              className="tool-input"
              id="ev-end"
              type="datetime-local"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-offset">
              UTC offset
            </label>
            <select
              className="tool-select"
              id="ev-offset"
              value={offset}
              onChange={(e) => setOffset(e.target.value)}
            >
              <option value="">None (floating)</option>
              <option value="-12:00">-12:00</option>
              <option value="-11:00">-11:00</option>
              <option value="-10:00">-10:00 (Hawaii)</option>
              <option value="-09:00">-09:00 (Alaska)</option>
              <option value="-08:00">-08:00 (US Pacific)</option>
              <option value="-07:00">-07:00 (US Mountain)</option>
              <option value="-06:00">-06:00 (US Central)</option>
              <option value="-05:00">-05:00 (US Eastern)</option>
              <option value="-04:00">-04:00</option>
              <option value="-03:00">-03:00</option>
              <option value="+00:00">+00:00 (UTC)</option>
              <option value="+01:00">+01:00 (CET)</option>
              <option value="+02:00">+02:00</option>
              <option value="+03:00">+03:00</option>
              <option value="+05:30">+05:30 (India)</option>
              <option value="+08:00">+08:00 (China)</option>
              <option value="+09:00">+09:00 (Japan)</option>
              <option value="+10:00">+10:00</option>
              <option value="+12:00">+12:00</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-mode">
              Attendance mode
            </label>
            <select
              className="tool-select"
              id="ev-mode"
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
            >
              <option value="offline">In person</option>
              <option value="online">Online</option>
              <option value="mixed">In person + online</option>
            </select>
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-status">
              Status
            </label>
            <select
              className="tool-select"
              id="ev-status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <option value="scheduled">Scheduled</option>
              <option value="cancelled">Cancelled</option>
              <option value="postponed">Postponed</option>
              <option value="rescheduled">Rescheduled</option>
              <option value="moved">Moved online</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-url">
              Event page URL
            </label>
            <input
              className="tool-input"
              id="ev-url"
              type="text"
              value={eventUrl}
              onChange={(e) => setEventUrl(e.target.value)}
              placeholder="https://example.com/events/..."
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-image">
              Image URL
            </label>
            <input
              className="tool-input"
              id="ev-image"
              type="text"
              value={image}
              onChange={(e) => setImage(e.target.value)}
              placeholder="https://example.com/image.jpg"
            />
          </div>
        </div>

        {showPhysical ? (
          <>
            <div className="tool-field">
              <label className="tool-label" htmlFor="ev-venue">
                Venue name
              </label>
              <input
                className="tool-input"
                id="ev-venue"
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Downtown Convention Center"
              />
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ev-street">
                  Street address
                </label>
                <input
                  className="tool-input"
                  id="ev-street"
                  type="text"
                  value={street}
                  onChange={(e) => setStreet(e.target.value)}
                  placeholder="120 Main Street"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ev-city">
                  City
                </label>
                <input
                  className="tool-input"
                  id="ev-city"
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  placeholder="Boston"
                />
              </div>
            </div>
            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="ev-region">
                  State / region
                </label>
                <input
                  className="tool-input"
                  id="ev-region"
                  type="text"
                  value={region}
                  onChange={(e) => setRegion(e.target.value)}
                  placeholder="MA"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ev-postal">
                  Postal code
                </label>
                <input
                  className="tool-input"
                  id="ev-postal"
                  type="text"
                  value={postal}
                  onChange={(e) => setPostal(e.target.value)}
                  placeholder="02110"
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="ev-country">
                  Country code
                </label>
                <input
                  className="tool-input"
                  id="ev-country"
                  type="text"
                  value={country}
                  onChange={(e) => setCountry(e.target.value)}
                  placeholder="US"
                />
              </div>
            </div>
          </>
        ) : null}

        {showVirtual ? (
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-virtual">
              Virtual attendance URL
            </label>
            <input
              className="tool-input"
              id="ev-virtual"
              type="text"
              value={virtualUrl}
              onChange={(e) => setVirtualUrl(e.target.value)}
              placeholder="https://zoom.us/j/..."
            />
          </div>
        ) : null}

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-price">
              Ticket price
            </label>
            <input
              className="tool-input"
              id="ev-price"
              type="text"
              inputMode="decimal"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              placeholder="49 (or 0 for free)"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-currency">
              Currency
            </label>
            <input
              className="tool-input"
              id="ev-currency"
              type="text"
              value={currency}
              onChange={(e) => setCurrency(e.target.value.toUpperCase())}
              placeholder="USD"
              maxLength={3}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-avail">
              Availability
            </label>
            <select
              className="tool-select"
              id="ev-avail"
              value={availability}
              onChange={(e) => setAvailability(e.target.value)}
            >
              <option value="instock">In stock</option>
              <option value="soldout">Sold out</option>
              <option value="preorder">Pre-order</option>
            </select>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-ticket">
              Ticket URL
            </label>
            <input
              className="tool-input"
              id="ev-ticket"
              type="text"
              value={ticketUrl}
              onChange={(e) => setTicketUrl(e.target.value)}
              placeholder="https://example.com/tickets"
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-validfrom">
              Tickets on sale from
            </label>
            <input
              className="tool-input"
              id="ev-validfrom"
              type="datetime-local"
              value={validFrom}
              onChange={(e) => setValidFrom(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-org">
              Organizer name
            </label>
            <input
              className="tool-input"
              id="ev-org"
              type="text"
              value={organizer}
              onChange={(e) => setOrganizer(e.target.value)}
              placeholder="Example Events Co."
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ev-orgurl">
              Organizer URL
            </label>
            <input
              className="tool-input"
              id="ev-orgurl"
              type="text"
              value={organizerUrl}
              onChange={(e) => setOrganizerUrl(e.target.value)}
              placeholder="https://example.com"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ev-performer">
            Performer(s) — comma separated (optional)
          </label>
          <input
            className="tool-input"
            id="ev-performer"
            type="text"
            value={performer}
            onChange={(e) => setPerformer(e.target.value)}
            placeholder="Jane Doe, The Keynotes"
          />
        </div>
      </div>

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

      <div className="tool-field">
        <label className="tool-label" htmlFor="ev-output">
          Event schema (JSON-LD)
        </label>
        <pre className="tool-output" id="ev-output" role="status" aria-live="polite">
          {json}
        </pre>
      </div>

      {warnings.length ? (
        <div className="tool-note">
          {warnings.map((w, i) => (
            <div key={i}>• {w}</div>
          ))}
        </div>
      ) : (
        <p className="tool-note">
          All required fields look good. Paste this into the &lt;head&gt; of your
          event page, then test it in Google&apos;s Rich Results Test.
        </p>
      )}

      {!hasName ? (
        <p className="tool-note">
          Fill in at least an event name and start date to generate valid Event
          markup.
        </p>
      ) : null}

      <p className="tool-note">
        This follows schema.org/Event and Google&apos;s Event structured-data
        guidelines. Everything runs in your browser — nothing you type is uploaded
        or stored.
      </p>
    </div>
  );
}
