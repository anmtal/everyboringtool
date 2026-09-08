"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// Base64url-encode a Uint8Array (no padding, URL-safe alphabet).
function base64UrlFromBytes(bytes) {
  let binary = "";
  for (let i = 0; i < bytes.length; i += 1) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

// Base64url-encode a UTF-8 string.
function base64UrlFromString(str) {
  return base64UrlFromBytes(new TextEncoder().encode(str));
}

const HASHES = {
  HS256: "SHA-256",
  HS384: "SHA-384",
  HS512: "SHA-512",
};

const DEFAULT_PAYLOAD = `{
  "sub": "1234567890",
  "name": "Jane Doe",
  "role": "admin"
}`;

export default function JwtGenerator() {
  const [alg, setAlg] = useState("HS256");
  const [payloadText, setPayloadText] = useState(DEFAULT_PAYLOAD);
  const [secret, setSecret] = useState("your-256-bit-secret");
  const [addIat, setAddIat] = useState(true);
  const [expiresIn, setExpiresIn] = useState("3600");
  const [token, setToken] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  // Parse the payload text and merge in optional iat/exp claims.
  const parsed = useMemo(() => {
    const trimmed = payloadText.trim();
    if (!trimmed) {
      return { error: "Enter a JSON payload to sign.", payload: null };
    }
    let obj;
    try {
      obj = JSON.parse(trimmed);
    } catch (e) {
      return { error: "Payload is not valid JSON. Check for a missing quote, comma, or brace.", payload: null };
    }
    if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
      return { error: "Payload must be a JSON object (e.g. { \"sub\": \"123\" }).", payload: null };
    }

    const claims = { ...obj };
    const nowSeconds = Math.floor(Date.now() / 1000);
    if (addIat) {
      claims.iat = nowSeconds;
    }
    const secs = parseInt(expiresIn, 10);
    if (expiresIn !== "" && Number.isFinite(secs) && secs > 0) {
      claims.exp = nowSeconds + secs;
    }
    return { error: "", payload: claims };
  }, [payloadText, addIat, expiresIn]);

  // Sign whenever inputs change. HMAC signing via WebCrypto is async.
  useEffect(() => {
    let cancelled = false;
    setCopied(false);

    async function sign() {
      if (parsed.error || !parsed.payload) {
        setToken("");
        setError(parsed.error);
        return;
      }
      if (!secret) {
        setToken("");
        setError("Enter a secret key to sign the token.");
        return;
      }

      try {
        const header = { alg, typ: "JWT" };
        const encodedHeader = base64UrlFromString(JSON.stringify(header));
        const encodedPayload = base64UrlFromString(JSON.stringify(parsed.payload));
        const signingInput = `${encodedHeader}.${encodedPayload}`;

        const key = await crypto.subtle.importKey(
          "raw",
          new TextEncoder().encode(secret),
          { name: "HMAC", hash: HASHES[alg] },
          false,
          ["sign"]
        );
        const sigBuffer = await crypto.subtle.sign(
          "HMAC",
          key,
          new TextEncoder().encode(signingInput)
        );
        const encodedSignature = base64UrlFromBytes(new Uint8Array(sigBuffer));

        if (!cancelled) {
          setToken(`${signingInput}.${encodedSignature}`);
          setError("");
        }
      } catch (e) {
        if (!cancelled) {
          setToken("");
          setError("Could not sign the token in this browser.");
        }
      }
    }

    sign();
    return () => {
      cancelled = true;
    };
  }, [alg, secret, parsed]);

  const headerPreview = useMemo(
    () => JSON.stringify({ alg, typ: "JWT" }, null, 2),
    [alg]
  );

  const payloadPreview = useMemo(() => {
    if (!parsed.payload) return "";
    return JSON.stringify(parsed.payload, null, 2);
  }, [parsed]);

  async function handleCopy() {
    if (!token) return;
    try {
      await copyText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="jwt-alg">
              Algorithm
            </label>
            <select
              id="jwt-alg"
              className="tool-select"
              value={alg}
              onChange={(e) => setAlg(e.target.value)}
            >
              <option value="HS256">HS256 (HMAC-SHA256)</option>
              <option value="HS384">HS384 (HMAC-SHA384)</option>
              <option value="HS512">HS512 (HMAC-SHA512)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="jwt-exp">
              Expires in (seconds)
            </label>
            <input
              id="jwt-exp"
              className="tool-input"
              type="number"
              min="0"
              value={expiresIn}
              onChange={(e) => setExpiresIn(e.target.value)}
              placeholder="Leave blank for no exp"
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="jwt-payload">
            Payload (JSON claims)
          </label>
          <textarea
            id="jwt-payload"
            className="tool-textarea"
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            rows={8}
            spellCheck={false}
            placeholder='{ "sub": "123", "name": "Jane Doe" }'
          />
          <p className="tool-note">
            <label htmlFor="jwt-iat">
              <input
                id="jwt-iat"
                type="checkbox"
                checked={addIat}
                onChange={(e) => setAddIat(e.target.checked)}
              />{" "}
              Add issued-at (iat) claim automatically
            </label>
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="jwt-secret">
            Secret key
          </label>
          <input
            id="jwt-secret"
            className="tool-input"
            type="text"
            value={secret}
            onChange={(e) => setSecret(e.target.value)}
            spellCheck={false}
            placeholder="Your HMAC secret"
          />
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {token ? (
        <div className="tool-field">
          <div className="tool-actions">
            <button
              className={copied ? "btn btn-success" : "btn btn-primary"}
              type="button"
              onClick={handleCopy}
            >
              {copied ? "Copied!" : "Copy JWT"}
            </button>
          </div>
          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Signed JSON Web Token</div>
            <pre className="tool-output" id="jwt-output">
              {token}
            </pre>
          </div>
          <p className="tool-note">
            {token.length.toLocaleString("en-US")} characters. Paste it into a
            debugger to verify the three dot-separated parts: header, payload,
            signature.
          </p>

          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="jwt-header-preview">
                Decoded header
              </label>
              <pre className="tool-output" id="jwt-header-preview">
                {headerPreview}
              </pre>
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="jwt-payload-preview">
                Decoded payload
              </label>
              <pre className="tool-output" id="jwt-payload-preview">
                {payloadPreview}
              </pre>
            </div>
          </div>
        </div>
      ) : null}

      {!token && !error ? (
        <p className="tool-note">
          Fill in a JSON payload and a secret to generate a signed token.
          Everything runs locally in your browser.
        </p>
      ) : null}
    </div>
  );
}
