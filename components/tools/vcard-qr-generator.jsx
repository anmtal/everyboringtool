"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";
import QRCode from "qrcode";

// Escape a vCard 3.0 text value: backslash, comma, semicolon and newlines
// each get a leading backslash per RFC 2426.
function escapeValue(value) {
  return String(value)
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Split a full name into family / given parts for the structured N field.
// Last whitespace-separated token becomes the family name, the rest the given
// name(s). A single word is treated as a given name only.
function splitName(fullName) {
  const parts = String(fullName).trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { family: "", given: "" };
  if (parts.length === 1) return { family: "", given: parts[0] };
  const family = parts[parts.length - 1];
  const given = parts.slice(0, -1).join(" ");
  return { family, given };
}

function buildVcard(fields) {
  const { fullName, phone, email, org, title, website, address } = fields;
  const name = splitName(fullName);

  const lines = ["BEGIN:VCARD", "VERSION:3.0"];

  // N is required by the spec; build it from the parsed full name.
  lines.push(
    `N:${escapeValue(name.family)};${escapeValue(name.given)};;;`
  );
  if (fullName.trim()) {
    lines.push(`FN:${escapeValue(fullName.trim())}`);
  }
  if (org.trim()) {
    lines.push(`ORG:${escapeValue(org.trim())}`);
  }
  if (title.trim()) {
    lines.push(`TITLE:${escapeValue(title.trim())}`);
  }
  if (phone.trim()) {
    lines.push(`TEL;TYPE=CELL,VOICE:${escapeValue(phone.trim())}`);
  }
  if (email.trim()) {
    lines.push(`EMAIL;TYPE=INTERNET:${escapeValue(email.trim())}`);
  }
  if (website.trim()) {
    let url = website.trim();
    if (!/^[a-z][a-z0-9+.-]*:\/\//i.test(url)) {
      url = `https://${url}`;
    }
    lines.push(`URL:${escapeValue(url)}`);
  }
  if (address.trim()) {
    // Single-line address goes into the street component of ADR:
    // PO;ext;street;locality;region;postcode;country
    lines.push(`ADR;TYPE=WORK:;;${escapeValue(address.trim())};;;;`);
  }

  lines.push("END:VCARD");
  // vCard lines are separated by CRLF.
  return lines.join("\r\n");
}

function slugify(value) {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "contact";
}

function countFilled(fields) {
  return Object.values(fields).filter((v) => String(v).trim()).length;
}

export default function VcardQrGenerator() {
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [org, setOrg] = useState("");
  const [title, setTitle] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");

  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const fields = useMemo(
    () => ({ fullName, phone, email, org, title, website, address }),
    [fullName, phone, email, org, title, website, address]
  );

  const vcard = useMemo(() => buildVcard(fields), [fields]);

  // Something meaningful to encode once any field has content.
  const hasContent = countFilled(fields) > 0;

  useEffect(() => {
    let cancelled = false;

    if (!hasContent) {
      setDataUrl("");
      setError("");
      return;
    }

    QRCode.toDataURL(vcard, { width: 320, margin: 2 })
      .then((url) => {
        if (!cancelled) {
          setDataUrl(url);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setDataUrl("");
          setError("Could not generate a QR code for this input.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [vcard, hasContent]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slugify(fullName || org)}-vcard-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleCopyVcard() {
    if (!hasContent) return;
    try {
      await copyText(vcard);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleClear() {
    setFullName("");
    setPhone("");
    setEmail("");
    setOrg("");
    setTitle("");
    setWebsite("");
    setAddress("");
    setDataUrl("");
    setError("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="vcard-name">
            Full name
          </label>
          <input
            className="tool-input"
            id="vcard-name"
            type="text"
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            placeholder="Jane Doe"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="vcard-phone">
              Phone
            </label>
            <input
              className="tool-input"
              id="vcard-phone"
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+1 555 123 4567"
              autoComplete="off"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="vcard-email">
              Email
            </label>
            <input
              className="tool-input"
              id="vcard-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="jane@example.com"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="vcard-org">
              Organization
            </label>
            <input
              className="tool-input"
              id="vcard-org"
              type="text"
              value={org}
              onChange={(e) => setOrg(e.target.value)}
              placeholder="Acme Inc."
              autoComplete="off"
            />
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="vcard-title">
              Job title
            </label>
            <input
              className="tool-input"
              id="vcard-title"
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Product Manager"
              autoComplete="off"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="vcard-website">
            Website
          </label>
          <input
            className="tool-input"
            id="vcard-website"
            type="url"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="example.com"
            autoComplete="off"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="vcard-address">
            Address
          </label>
          <textarea
            className="tool-textarea"
            id="vcard-address"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="123 Main St, Springfield, IL 62704"
            rows={2}
          />
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {hasContent && dataUrl ? (
        <>
          <div
            className="tool-result" role="status" aria-live="polite"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            <div className="tool-result-label">Your contact QR code</div>
            <img
              src={dataUrl}
              alt={`vCard QR code${
                fullName.trim() ? ` for ${fullName.trim()}` : ""
              }`}
              width={320}
              height={320}
              style={{
                width: "100%",
                maxWidth: "320px",
                height: "auto",
                borderRadius: "8px",
                background: "#ffffff",
                padding: "8px",
                border: "1px solid rgba(128,128,128,0.25)",
              }}
            />
          </div>

          <div className="tool-actions">
            <button
              className="btn btn-success"
              type="button"
              onClick={handleDownload}
            >
              Download PNG
            </button>
            <button
              className={copied ? "btn btn-primary" : "btn"}
              type="button"
              onClick={handleCopyVcard}
            >
              {copied ? "Copied!" : "Copy vCard"}
            </button>
            <button className="btn" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="vcard-output">
              Encoded vCard
            </label>
            <pre className="tool-output" id="vcard-output">
              {vcard}
            </pre>
          </div>

          <p className="tool-note">
            Scanning this QR code with a phone camera prompts it to save a new
            contact with these details. Print it on a business card, add it to
            an email signature, or share the image directly.
          </p>
        </>
      ) : (
        <p className="tool-note">
          Fill in at least one field above to generate a scannable contact QR
          code. Everything is built right here in your browser — your details
          never leave your device.
        </p>
      )}
    </div>
  );
}
