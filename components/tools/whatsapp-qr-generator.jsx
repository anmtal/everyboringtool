"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";

export default function WhatsappQrGenerator() {
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  // Strip everything that is not a digit. Leading "+" and spaces/dashes are removed.
  const digits = phone.replace(/\D/g, "");
  const isValid = digits.length >= 7 && digits.length <= 15;

  const trimmedMessage = message.trim();
  const waLink = isValid
    ? `https://wa.me/${digits}${
        trimmedMessage ? `?text=${encodeURIComponent(trimmedMessage)}` : ""
      }`
    : "";

  // Generate the QR whenever the link changes.
  useEffect(() => {
    let cancelled = false;

    if (!waLink) {
      setQrDataUrl("");
      return;
    }

    QRCode.toDataURL(waLink, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((url) => {
        if (!cancelled) {
          setQrDataUrl(url);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
          setError("Could not generate the QR code. Please try again.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [waLink]);

  // Clean up the copy timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!waLink) return;
    try {
      await navigator.clipboard.writeText(waLink);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy failed. You can select and copy the link manually.");
    }
  }, [waLink]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    a.download = `whatsapp-qr-${digits || "code"}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [qrDataUrl, digits]);

  const showValidationError = phone.length > 0 && !isValid;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wa-phone">
              Phone number (with country code)
            </label>
            <input
              id="wa-phone"
              className="tool-input"
              type="tel"
              inputMode="tel"
              autoComplete="off"
              placeholder="e.g. +1 415 555 0132"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
            />
            <p className="tool-note">
              Include the country code. Spaces, dashes, and the + sign are
              removed automatically.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wa-message">
              Pre-filled message (optional)
            </label>
            <textarea
              id="wa-message"
              className="tool-textarea"
              rows={3}
              placeholder="Hi! I'd like to know more about..."
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />
            <p className="tool-note">
              This text is pre-typed in the chat when someone scans the code.
              They still choose to send it.
            </p>
          </div>
        </div>
      </div>

      {showValidationError && (
        <div className="tool-error">
          Enter a valid phone number with country code (7 to 15 digits).
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

      {isValid && qrDataUrl && (
        <>
          <div className="tool-stat-grid">
            <div className="tool-stat">
              <div className="tool-stat-num">{digits.length}</div>
              <div className="tool-stat-label">Digits</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">
                {trimmedMessage ? trimmedMessage.length : 0}
              </div>
              <div className="tool-stat-label">Message chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{trimmedMessage ? "Yes" : "No"}</div>
              <div className="tool-stat-label">Pre-filled text</div>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "center",
              margin: "20px 0",
            }}
          >
            <div
              style={{
                background: "#ffffff",
                padding: "16px",
                borderRadius: "12px",
                border: "1px solid rgba(128,128,128,0.25)",
                boxShadow: "0 1px 3px rgba(0,0,0,0.12)",
              }}
            >
              <img
                src={qrDataUrl}
                alt={`WhatsApp QR code for +${digits}`}
                width={240}
                height={240}
                style={{ display: "block", width: 240, height: 240 }}
              />
            </div>
          </div>

          <div className="tool-result">
            <div className="tool-result-label">wa.me link</div>
            <div className="tool-result-value">{waLink}</div>
          </div>

          <div className="tool-actions">
            <button
              type="button"
              className="btn btn-primary"
              onClick={handleDownload}
            >
              Download PNG
            </button>
            <button type="button" className="btn" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy link"}
            </button>
            <a
              className="btn btn-success"
              href={waLink}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open chat
            </a>
          </div>
        </>
      )}

      {!phone && (
        <p className="tool-note">
          Enter a phone number above to generate a scannable WhatsApp QR code and
          a shareable wa.me link.
        </p>
      )}
    </div>
  );
}
