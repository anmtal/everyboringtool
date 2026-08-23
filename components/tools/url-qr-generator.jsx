"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

const SIZES = [256, 512, 1024];

function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  // If the user already included a scheme (http://, https://, ftp://, mailto:, etc.), keep it.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return "https://" + trimmed;
}

export default function UrlQrGenerator() {
  const [url, setUrl] = useState("");
  const [size, setSize] = useState(256);
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  const finalUrl = normalizeUrl(url);

  useEffect(() => {
    if (!finalUrl) {
      setDataUrl("");
      setError("");
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(finalUrl, { width: size, margin: 2 })
      .then((generated) => {
        if (cancelled) return;
        setDataUrl(generated);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl("");
        setError(
          "Couldn't generate a QR code for that URL. Try a shorter or simpler address."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [finalUrl, size]);

  const hasInput = url.trim().length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="qr-url">
            Website URL
          </label>
          <input
            id="qr-url"
            type="text"
            className="tool-input"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="example.com or https://example.com/page"
            inputMode="url"
            autoComplete="off"
            spellCheck="false"
          />
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="qr-size">
            Size
          </label>
          <select
            id="qr-size"
            className="tool-select"
            value={size}
            onChange={(e) => setSize(Number(e.target.value))}
          >
            {SIZES.map((s) => (
              <option key={s} value={s}>
                {s} × {s} px
              </option>
            ))}
          </select>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {!hasInput && (
        <p className="tool-note">
          Type a website address above and your QR code appears here instantly.
          No scheme? We add https:// for you automatically.
        </p>
      )}

      {hasInput && dataUrl && (
        <>
          <div
            className="tool-result"
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "0.75rem",
            }}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={dataUrl}
              alt={`QR code for ${finalUrl}`}
              width={256}
              height={256}
              style={{
                width: 256,
                maxWidth: "100%",
                height: "auto",
                imageRendering: "pixelated",
                background: "#fff",
                borderRadius: 8,
                padding: 8,
              }}
            />
            <div className="tool-result-label" style={{ wordBreak: "break-all", textAlign: "center" }}>
              {finalUrl}
            </div>
            <div className="tool-result-value">{size} × {size} px</div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={dataUrl} download="url-qr-code.png">
              ↓ Download PNG
            </a>
          </div>
        </>
      )}
    </div>
  );
}
