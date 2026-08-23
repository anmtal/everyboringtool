"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";

// Basic, forgiving email check. We only require something@something.tld shape.
function isValidEmail(value) {
  const trimmed = value.trim();
  if (!trimmed) return false;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed);
}

// Build a mailto: link. Subject and body are optional; both are URL-encoded.
function buildMailto(email, subject, body) {
  const address = email.trim();
  const params = [];
  if (subject.trim()) params.push(`subject=${encodeURIComponent(subject)}`);
  if (body) params.push(`body=${encodeURIComponent(body)}`);
  return `mailto:${address}${params.length ? `?${params.join("&")}` : ""}`;
}

export default function EmailQrGenerator() {
  const [email, setEmail] = useState("");
  const [subject, setSubject] = useState("");
  const [body, setBody] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);

  const emailValid = isValidEmail(email);
  const mailtoLink = emailValid ? buildMailto(email, subject, body) : "";

  // Generate the QR whenever the resulting mailto link changes.
  useEffect(() => {
    let cancelled = false;

    if (!mailtoLink) {
      setQrDataUrl("");
      setError("");
      return;
    }

    QRCode.toDataURL(mailtoLink, {
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
          setError(
            "Could not generate the QR code. Try a shorter subject or message."
          );
        }
      });

    return () => {
      cancelled = true;
    };
  }, [mailtoLink]);

  // Clean up the copy timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const handleCopy = useCallback(async () => {
    if (!mailtoLink) return;
    try {
      await navigator.clipboard.writeText(mailtoLink);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy failed. You can select and copy the link manually.");
    }
  }, [mailtoLink]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;
    const a = document.createElement("a");
    a.href = qrDataUrl;
    const namePart = email.trim().split("@")[0] || "code";
    a.download = `email-qr-${namePart}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [qrDataUrl, email]);

  const showValidationError = email.trim().length > 0 && !emailValid;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="eq-email">
              Recipient email
            </label>
            <input
              id="eq-email"
              className="tool-input"
              type="email"
              inputMode="email"
              autoComplete="off"
              spellCheck="false"
              placeholder="e.g. hello@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="eq-subject">
              Subject (optional)
            </label>
            <input
              id="eq-subject"
              className="tool-input"
              type="text"
              autoComplete="off"
              placeholder="e.g. Quick question about your service"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="eq-body">
              Message body (optional)
            </label>
            <textarea
              id="eq-body"
              className="tool-textarea"
              rows={4}
              placeholder="Hi, I'd love to learn more about..."
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
            <p className="tool-note">
              The subject and message are pre-filled in the person's email app
              when they scan. They still choose to send it.
            </p>
          </div>
        </div>
      </div>

      {showValidationError && (
        <div className="tool-error">
          Enter a valid email address, like name@example.com.
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

      {emailValid && qrDataUrl && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{subject.trim().length}</div>
              <div className="tool-stat-label">Subject chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{body.length}</div>
              <div className="tool-stat-label">Body chars</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{mailtoLink.length}</div>
              <div className="tool-stat-label">Link length</div>
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
                alt={`Email QR code for ${email.trim()}`}
                width={240}
                height={240}
                style={{ display: "block", width: 240, height: 240 }}
              />
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">mailto link</div>
            <div className="tool-result-value" style={{ wordBreak: "break-all" }}>
              {mailtoLink}
            </div>
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
            <a className="btn btn-success" href={mailtoLink}>
              Open in email app
            </a>
          </div>
        </>
      )}

      {!email && (
        <p className="tool-note">
          Enter a recipient email above to generate a scannable QR code. Scanning
          it opens a new pre-addressed message in the person's email app.
        </p>
      )}
    </div>
  );
}
