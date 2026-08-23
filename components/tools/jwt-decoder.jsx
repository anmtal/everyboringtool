"use client";

import { useMemo, useState } from "react";

const SAMPLE_TOKEN =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." +
  "eyJzdWIiOiIxMjM0NTY3ODkwIiwibmFtZSI6IkphbmUgRG9lIiwiaWF0IjoxNTE2MjM5MDIyLCJleHAiOjE1MTYyNDI2MjJ9." +
  "SflKxwRJSMeKKF2QT4fwpMeJf36POk6yJV_adQssw5c";

// Base64url -> UTF-8 string. Restores standard base64 padding/alphabet,
// runs atob, then decodes the resulting binary string as UTF-8.
function base64UrlDecode(segment) {
  let base64 = segment.replace(/-/g, "+").replace(/_/g, "/");
  const pad = base64.length % 4;
  if (pad === 1) {
    // A length of 4n+1 is never valid base64.
    throw new Error("bad-length");
  }
  if (pad) {
    base64 += "=".repeat(4 - pad);
  }
  const binary = atob(base64);
  // Rebuild the byte array and decode as UTF-8 so non-ASCII survives.
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) {
    bytes[i] = binary.charCodeAt(i);
  }
  try {
    return new TextDecoder("utf-8", { fatal: false }).decode(bytes);
  } catch (e) {
    return binary;
  }
}

function prettyJson(obj) {
  return JSON.stringify(obj, null, 2);
}

// Format an epoch-seconds claim as a readable local + UTC string.
function formatEpoch(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    return null;
  }
  const ms = value * 1000;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return null;
  }
  const local = date.toLocaleString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  return { date, local, utc: date.toUTCString() };
}

function decodeToken(raw) {
  const token = raw.trim();
  if (!token) {
    return { status: "empty" };
  }

  const parts = token.split(".");
  if (parts.length !== 3) {
    return {
      status: "error",
      error:
        "A JWT must have three parts separated by dots (header.payload.signature). This token has " +
        parts.length +
        (parts.length === 1 ? " part." : " parts."),
    };
  }

  const [headerPart, payloadPart, signaturePart] = parts;
  if (!headerPart || !payloadPart) {
    return {
      status: "error",
      error: "The header or payload segment is empty. This is not a valid JWT.",
    };
  }

  let header;
  let payload;

  try {
    const headerText = base64UrlDecode(headerPart);
    header = JSON.parse(headerText);
  } catch (e) {
    return {
      status: "error",
      error:
        "Could not decode the header. It is not valid base64url-encoded JSON.",
    };
  }

  try {
    const payloadText = base64UrlDecode(payloadPart);
    payload = JSON.parse(payloadText);
  } catch (e) {
    return {
      status: "error",
      error:
        "Could not decode the payload. It is not valid base64url-encoded JSON.",
    };
  }

  const isObject = (v) => v && typeof v === "object" && !Array.isArray(v);
  if (!isObject(header) || !isObject(payload)) {
    return {
      status: "error",
      error:
        "The header and payload must each decode to a JSON object. This token does not follow the JWT format.",
    };
  }

  const nowSeconds = Date.now() / 1000;

  const exp = typeof payload.exp === "number" ? payload.exp : null;
  const iat = typeof payload.iat === "number" ? payload.iat : null;
  const nbf = typeof payload.nbf === "number" ? payload.nbf : null;

  let validity = null;
  if (exp !== null || nbf !== null) {
    const isExpired = exp !== null && nowSeconds >= exp;
    const isNotYetValid = nbf !== null && nowSeconds < nbf;
    if (isExpired) {
      validity = { state: "expired", label: "Expired" };
    } else if (isNotYetValid) {
      validity = { state: "not-yet-valid", label: "Not yet valid" };
    } else {
      validity = { state: "valid", label: "Not expired" };
    }
  }

  return {
    status: "ok",
    header,
    payload,
    signature: signaturePart,
    alg: typeof header.alg === "string" ? header.alg : null,
    typ: typeof header.typ === "string" ? header.typ : null,
    times: {
      iat: iat !== null ? { value: iat, ...formatEpoch(iat) } : null,
      nbf: nbf !== null ? { value: nbf, ...formatEpoch(nbf) } : null,
      exp: exp !== null ? { value: exp, ...formatEpoch(exp) } : null,
    },
    validity,
  };
}

const CLAIM_LABELS = {
  iat: "Issued at (iat)",
  nbf: "Not before (nbf)",
  exp: "Expires (exp)",
};

const badgeColors = {
  valid: { border: "rgba(34,197,94,0.5)", color: "#16a34a" },
  expired: { border: "rgba(239,68,68,0.5)", color: "#dc2626" },
  "not-yet-valid": { border: "rgba(234,179,8,0.5)", color: "#ca8a04" },
};

export default function JwtDecoder() {
  const [input, setInput] = useState("");
  const [copied, setCopied] = useState("");

  const result = useMemo(() => decodeToken(input), [input]);

  function handleChange(e) {
    setInput(e.target.value);
    setCopied("");
  }

  function handleClear() {
    setInput("");
    setCopied("");
  }

  function handleSample() {
    setInput(SAMPLE_TOKEN);
    setCopied("");
  }

  async function handleCopy(key, text) {
    if (!text) return;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(key);
      setTimeout(() => setCopied(""), 1500);
    } catch (e) {
      setCopied("");
    }
  }

  const timeRows =
    result.status === "ok"
      ? ["iat", "nbf", "exp"]
          .map((key) => ({ key, data: result.times[key] }))
          .filter((row) => row.data)
      : [];

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="jwt-input">
            JSON Web Token
          </label>
          <textarea
            id="jwt-input"
            className="tool-textarea"
            value={input}
            onChange={handleChange}
            placeholder="Paste a JWT here (eyJhbGci….eyJzdWIi….SflKxw…)"
            rows={6}
            spellCheck={false}
            autoComplete="off"
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={handleSample}>
          Load sample token
        </button>
        <button className="btn" type="button" onClick={handleClear}>
          Clear
        </button>
      </div>

      {result.status === "error" ? (
        <p className="tool-error">{result.error}</p>
      ) : null}

      {result.status === "empty" ? (
        <p className="tool-note">
          Paste a token above to decode it. Everything runs in your browser —
          the token is never uploaded. The signature is not verified; this tool
          only reads the header and payload.
        </p>
      ) : null}

      {result.status === "ok" ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{result.alg || "—"}</div>
              <div className="tool-stat-label">Algorithm (alg)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{result.typ || "—"}</div>
              <div className="tool-stat-label">Type (typ)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {result.validity ? (
                  <span
                    style={{
                      display: "inline-block",
                      padding: "0.15em 0.6em",
                      borderRadius: "999px",
                      border:
                        "1px solid " +
                        (badgeColors[result.validity.state]?.border ||
                          "rgba(148,163,184,0.5)"),
                      color:
                        badgeColors[result.validity.state]?.color ||
                        "currentColor",
                      fontSize: "0.7em",
                      fontWeight: 700,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                    }}
                  >
                    {result.validity.label}
                  </span>
                ) : (
                  "—"
                )}
              </div>
              <div className="tool-stat-label">Status</div>
            </div>
          </div>

          <p className="tool-note">
            Signature <strong>not verified</strong> — this tool decodes the
            token but does not check that it is authentic or untampered. Never
            trust a token based on its decoded contents alone.
          </p>

          {timeRows.length > 0 ? (
            <div className="tool-result" role="status" aria-live="polite">
              <div className="tool-result-label">Timestamps</div>
              <div
                className="tool-result-value"
                style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}
              >
                {timeRows.map(({ key, data }) => (
                  <div key={key}>
                    <div style={{ fontWeight: 600 }}>{CLAIM_LABELS[key]}</div>
                    <div style={{ opacity: 0.85 }}>
                      {data.local
                        ? data.local + " (local)"
                        : "Unrecognized time value"}
                    </div>
                    {data.utc ? (
                      <div style={{ opacity: 0.7, fontSize: "0.85em" }}>
                        {data.utc} · epoch {data.value}
                      </div>
                    ) : null}
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied === "header" ? "btn btn-success" : "btn"}
                type="button"
                onClick={() => handleCopy("header", prettyJson(result.header))}
              >
                {copied === "header" ? "Copied!" : "Copy header"}
              </button>
            </div>
            <label className="tool-label" htmlFor="jwt-header">
              Header
            </label>
            <pre className="tool-output" id="jwt-header">
              {prettyJson(result.header)}
            </pre>
          </div>

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied === "payload" ? "btn btn-success" : "btn"}
                type="button"
                onClick={() => handleCopy("payload", prettyJson(result.payload))}
              >
                {copied === "payload" ? "Copied!" : "Copy payload"}
              </button>
            </div>
            <label className="tool-label" htmlFor="jwt-payload">
              Payload
            </label>
            <pre className="tool-output" id="jwt-payload">
              {prettyJson(result.payload)}
            </pre>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="jwt-signature">
              Signature (encoded, not verified)
            </label>
            <pre className="tool-output" id="jwt-signature">
              {result.signature || "(none)"}
            </pre>
          </div>
        </>
      ) : null}
    </div>
  );
}
