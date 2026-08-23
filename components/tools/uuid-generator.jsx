"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const MAX_COUNT = 100;

// Generate a single RFC 4122 version 4 UUID. Prefers the native
// crypto.randomUUID(); falls back to crypto.getRandomValues for older
// browsers so the tool never crashes on environments without randomUUID.
function generateUuid() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }

  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);

  // Set the version (4) and variant (10xx) bits per RFC 4122.
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;

  const hex = [];
  for (let i = 0; i < 16; i++) {
    hex.push(bytes[i].toString(16).padStart(2, "0"));
  }

  return (
    hex.slice(0, 4).join("") +
    "-" +
    hex.slice(4, 6).join("") +
    "-" +
    hex.slice(6, 8).join("") +
    "-" +
    hex.slice(8, 10).join("") +
    "-" +
    hex.slice(10, 16).join("")
  );
}

function generateUuids(count) {
  const out = new Array(count);
  for (let i = 0; i < count; i++) {
    out[i] = generateUuid();
  }
  return out;
}

// Parse the count field into a whole number, or null if it isn't a valid
// positive integer.
function parseCount(text) {
  if (typeof text !== "string") return null;
  const trimmed = text.trim();
  if (!/^\d+$/.test(trimmed)) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || !Number.isSafeInteger(n)) return null;
  return n;
}

export default function UuidGenerator() {
  const [countText, setCountText] = useState("1");
  const [uppercase, setUppercase] = useState(false);
  const [removeHyphens, setRemoveHyphens] = useState(false);
  const [uuids, setUuids] = useState([]);
  const [copied, setCopied] = useState(false);

  const count = useMemo(() => parseCount(countText), [countText]);

  const error = useMemo(() => {
    if (count === null) return "Enter a valid whole number for how many.";
    if (count < 1) return "Generate at least one UUID.";
    if (count > MAX_COUNT)
      return `You can generate up to ${MAX_COUNT} UUIDs at a time.`;
    return null;
  }, [count]);

  const regenerate = useCallback(() => {
    setCopied(false);
    if (error) {
      setUuids([]);
      return;
    }
    setUuids(generateUuids(count));
  }, [error, count]);

  // Generate once on mount so the user sees a result immediately.
  useEffect(() => {
    setUuids(generateUuids(1));
  }, []);

  // Clear stale results whenever the count becomes invalid.
  useEffect(() => {
    if (error) setUuids([]);
  }, [error]);

  // Apply the display options to the raw UUIDs.
  const formatted = useMemo(() => {
    return uuids.map((u) => {
      let v = u;
      if (removeHyphens) v = v.replace(/-/g, "");
      if (uppercase) v = v.toUpperCase();
      return v;
    });
  }, [uuids, uppercase, removeHyphens]);

  const joined = useMemo(() => formatted.join("\n"), [formatted]);

  async function handleCopy() {
    if (formatted.length === 0) return;
    try {
      await copyText(joined);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="uuid-count">
              How many
            </label>
            <input
              id="uuid-count"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min={1}
              max={MAX_COUNT}
              step={1}
              value={countText}
              onChange={(e) => setCountText(e.target.value)}
              placeholder="1"
            />
          </div>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="uuid-uppercase"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="uuid-uppercase"
              type="checkbox"
              checked={uppercase}
              onChange={(e) => setUppercase(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Uppercase
          </label>
        </div>

        <div className="tool-field">
          <label
            className="tool-label"
            htmlFor="uuid-remove-hyphens"
            style={{ fontWeight: "normal" }}
          >
            <input
              id="uuid-remove-hyphens"
              type="checkbox"
              checked={removeHyphens}
              onChange={(e) => setRemoveHyphens(e.target.checked)}
              style={{ marginRight: "0.5rem" }}
            />
            Remove hyphens
          </label>
        </div>
      </div>

      <div className="tool-actions">
        <button
          className="btn btn-primary"
          type="button"
          onClick={regenerate}
          disabled={!!error}
        >
          Regenerate
        </button>
        <button
          className={copied ? "btn btn-success" : "btn"}
          type="button"
          onClick={handleCopy}
          disabled={formatted.length === 0}
        >
          {copied ? "Copied!" : formatted.length > 1 ? "Copy all" : "Copy"}
        </button>
      </div>

      {error ? (
        <div className="tool-error">{error}</div>
      ) : formatted.length > 0 ? (
        <>
          <pre className="tool-output" aria-label="Generated UUIDs">
            {joined}
          </pre>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatted.length}</div>
              <div className="tool-stat-label">
                {formatted.length === 1 ? "UUID" : "UUIDs"}
              </div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">4</div>
              <div className="tool-stat-label">Version</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {removeHyphens ? "32" : "36"}
              </div>
              <div className="tool-stat-label">Characters each</div>
            </div>
          </div>
        </>
      ) : null}

      <p className="tool-note">
        Version 4 UUIDs are generated with your browser&apos;s built-in
        cryptographic generator (crypto.randomUUID) for high-quality randomness.
        Everything runs locally on your device — nothing is uploaded or stored
        anywhere.
      </p>
    </div>
  );
}
