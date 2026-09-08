"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Web Crypto exposes HMAC with these hash functions. SHA-1 is kept because a
// lot of legacy webhook/signature schemes (older AWS, some payment gateways)
// still use HMAC-SHA1.
const HASHES = [
  { key: "SHA-256", label: "SHA-256" },
  { key: "SHA-1", label: "SHA-1" },
  { key: "SHA-384", label: "SHA-384" },
  { key: "SHA-512", label: "SHA-512" },
];

const KEY_ENCODINGS = [
  { key: "utf8", label: "Text (UTF-8)" },
  { key: "hex", label: "Hex" },
  { key: "base64", label: "Base64" },
];

function bufferToHex(buffer) {
  const view = new Uint8Array(buffer);
  let hex = "";
  for (let i = 0; i < view.length; i++) {
    hex += view[i].toString(16).padStart(2, "0");
  }
  return hex;
}

function bufferToBase64(buffer) {
  const view = new Uint8Array(buffer);
  let binary = "";
  for (let i = 0; i < view.length; i++) {
    binary += String.fromCharCode(view[i]);
  }
  return btoa(binary);
}

// Decode a hex string into bytes. Throws on odd length or non-hex chars so the
// UI can show a precise error instead of silently signing garbage.
function hexToBytes(str) {
  const clean = str.replace(/\s+/g, "");
  if (clean.length === 0) return new Uint8Array(0);
  if (clean.length % 2 !== 0) {
    throw new Error("Hex key must have an even number of characters.");
  }
  if (!/^[0-9a-fA-F]+$/.test(clean)) {
    throw new Error("Hex key contains non-hexadecimal characters.");
  }
  const bytes = new Uint8Array(clean.length / 2);
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Decode a base64 string into bytes with a clear error on malformed input.
function base64ToBytes(str) {
  const clean = str.replace(/\s+/g, "");
  if (clean.length === 0) return new Uint8Array(0);
  let binary;
  try {
    binary = atob(clean);
  } catch (e) {
    throw new Error("Key is not valid Base64.");
  }
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

function keyToBytes(keyText, encoding) {
  if (encoding === "hex") return hexToBytes(keyText);
  if (encoding === "base64") return base64ToBytes(keyText);
  return new TextEncoder().encode(keyText);
}

export default function HmacGenerator() {
  const [message, setMessage] = useState(
    "The quick brown fox jumps over the lazy dog"
  );
  const [secret, setSecret] = useState("my-secret-key");
  const [keyEncoding, setKeyEncoding] = useState("utf8");
  const [hash, setHash] = useState("SHA-256");
  const [hex, setHex] = useState("");
  const [base64, setBase64] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState("");

  const byteLength = useMemo(() => {
    try {
      return new TextEncoder().encode(message).length;
    } catch (e) {
      return 0;
    }
  }, [message]);

  useEffect(() => {
    let cancelled = false;

    async function compute() {
      const subtle =
        typeof crypto !== "undefined" && crypto.subtle ? crypto.subtle : null;

      if (!subtle) {
        setError(
          "HMAC needs the Web Crypto API, which is only available on secure (https) pages."
        );
        setHex("");
        setBase64("");
        return;
      }

      if (secret.length === 0) {
        setError("");
        setHex("");
        setBase64("");
        return;
      }

      let keyBytes;
      try {
        keyBytes = keyToBytes(secret, keyEncoding);
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setHex("");
          setBase64("");
        }
        return;
      }

      try {
        const cryptoKey = await subtle.importKey(
          "raw",
          keyBytes,
          { name: "HMAC", hash: { name: hash } },
          false,
          ["sign"]
        );
        const msgBytes = new TextEncoder().encode(message);
        const sig = await subtle.sign("HMAC", cryptoKey, msgBytes);
        if (cancelled) return;
        setHex(bufferToHex(sig));
        setBase64(bufferToBase64(sig));
        setError("");
      } catch (e) {
        if (!cancelled) {
          setError("Could not compute the HMAC for this input.");
          setHex("");
          setBase64("");
        }
      }
    }

    compute();

    return () => {
      cancelled = true;
    };
  }, [message, secret, keyEncoding, hash]);

  async function handleCopy(which, value) {
    if (!value) return;
    try {
      await copyText(value);
      setCopied(which);
      setTimeout(
        () => setCopied((cur) => (cur === which ? "" : cur)),
        1500
      );
    } catch (e) {
      setCopied("");
    }
  }

  const hasOutput = Boolean(hex);

  const outputs = [
    { which: "hex", label: "HMAC (hex)", value: hex },
    { which: "base64", label: "HMAC (Base64)", value: base64 },
  ];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="hmac-message">
            Message
          </label>
          <textarea
            id="hmac-message"
            className="tool-textarea"
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Type or paste the message to sign…"
            rows={6}
            spellCheck={false}
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="hmac-secret">
            Secret key
          </label>
          <textarea
            id="hmac-secret"
            className="tool-textarea"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            placeholder="Enter the shared secret key…"
            rows={2}
            spellCheck={false}
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="hmac-key-encoding">
              Key encoding
            </label>
            <select
              id="hmac-key-encoding"
              className="tool-select"
              value={keyEncoding}
              onChange={(e) => setKeyEncoding(e.target.value)}
            >
              {KEY_ENCODINGS.map((k) => (
                <option key={k.key} value={k.key}>
                  {k.label}
                </option>
              ))}
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="hmac-hash">
              Hash algorithm
            </label>
            <select
              id="hmac-hash"
              className="tool-select"
              value={hash}
              onChange={(e) => setHash(e.target.value)}
            >
              {HASHES.map((h) => (
                <option key={h.key} value={h.key}>
                  {h.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {hasOutput ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">
                {message.length.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Characters</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {byteLength.toLocaleString("en-US")}
              </div>
              <div className="tool-stat-label">Message bytes</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">HMAC-{hash.replace("SHA-", "SHA")}</div>
              <div className="tool-stat-label">Algorithm</div>
            </div>
          </div>

          {outputs.map(({ which, label, value }) => {
            const isCopied = copied === which;
            return (
              <div className="tool-field" key={which}>
                <div className="tool-actions">
                  <span className="tool-label">{label}</span>
                  <button
                    className={isCopied ? "btn btn-success" : "btn btn-primary"}
                    type="button"
                    onClick={() => handleCopy(which, value)}
                    disabled={!value}
                    aria-label={`Copy ${label}`}
                  >
                    {isCopied ? "Copied!" : "Copy"}
                  </button>
                </div>
                <pre className="tool-output">{value}</pre>
              </div>
            );
          })}
        </>
      ) : (
        <p className="tool-note">
          Enter a message and a secret key above to generate an HMAC signature.
          Everything is computed live in your browser with the Web Crypto API —
          your message and key are never uploaded.
        </p>
      )}
    </div>
  );
}
