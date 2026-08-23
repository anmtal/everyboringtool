"use client";

import { useState, useEffect } from "react";
import QRCode from "qrcode";

const SIZES = [256, 512, 1024];
const LEVELS = [
  { value: "L", label: "L — Low (~7%)" },
  { value: "M", label: "M — Medium (~15%)" },
  { value: "Q", label: "Q — Quartile (~25%)" },
  { value: "H", label: "H — High (~30%)" },
];

export default function QrCodeGenerator() {
  const [text, setText] = useState("");
  const [size, setSize] = useState(256);
  const [level, setLevel] = useState("M");
  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");

  useEffect(() => {
    const value = text.trim();
    if (!value) {
      setDataUrl("");
      setError("");
      return;
    }

    let cancelled = false;

    QRCode.toDataURL(value, {
      width: size,
      errorCorrectionLevel: level,
      margin: 2,
    })
      .then((url) => {
        if (cancelled) return;
        setDataUrl(url);
        setError("");
      })
      .catch(() => {
        if (cancelled) return;
        setDataUrl("");
        setError(
          "Couldn't generate a QR code for that input. Try shorter text or a lower error-correction level."
        );
      });

    return () => {
      cancelled = true;
    };
  }, [text, size, level]);

  const hasInput = text.trim().length > 0;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="qr-text">
            Text or URL
          </label>
          <textarea
            id="qr-text"
            className="tool-textarea"
            rows={3}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="https://example.com or any text you want to encode"
          />
        </div>

        <div className="tool-row">
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

          <div className="tool-field">
            <label className="tool-label" htmlFor="qr-level">
              Error correction
            </label>
            <select
              id="qr-level"
              className="tool-select"
              value={level}
              onChange={(e) => setLevel(e.target.value)}
            >
              {LEVELS.map((l) => (
                <option key={l.value} value={l.value}>
                  {l.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {!hasInput && (
        <p className="tool-note">
          Enter some text or a URL above and your QR code will appear here
          instantly. Higher error correction survives more scuffs and logos but
          packs the code more densely.
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
              alt="Generated QR code"
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
            <div className="tool-result-label">
              {size} × {size} px · Level {level}
            </div>
          </div>

          <div className="tool-actions">
            <a className="btn btn-success" href={dataUrl} download="qrcode.png">
              ↓ Download PNG
            </a>
          </div>
        </>
      )}
    </div>
  );
}
