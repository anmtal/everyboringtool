"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import QRCode from "qrcode";

// Quick-fill presets for common bio platforms. Each prefills the https:// prefix
// and, where useful, the platform's domain so the user only types their handle.
const PRESETS = [
  { name: "Instagram", prefix: "https://instagram.com/" },
  { name: "TikTok", prefix: "https://tiktok.com/@" },
  { name: "Linktree", prefix: "https://linktr.ee/" },
  { name: "YouTube", prefix: "https://youtube.com/@" },
  { name: "X (Twitter)", prefix: "https://x.com/" },
  { name: "https://", prefix: "https://" },
];

// Normalize a user-entered URL. If there is no scheme, assume https://.
// Returns "" if there is nothing usable.
function normalizeUrl(raw) {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return trimmed;
  // Leave other explicit schemes (mailto:, tel:) untouched.
  if (/^[a-zA-Z][a-zA-Z0-9+.-]*:/.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
}

// Validate the normalized URL using the built-in URL parser. We require a host
// with a dot so bare words like "hello" don't pass as a valid site.
function isValidUrl(normalized) {
  if (!normalized) return false;
  try {
    const u = new URL(normalized);
    if (u.protocol === "http:" || u.protocol === "https:") {
      return /\./.test(u.hostname) && u.hostname.length > 2;
    }
    // Allow other schemes (mailto, tel) to pass through as-is.
    return true;
  } catch {
    return false;
  }
}

export default function LinkInBioQr() {
  const [url, setUrl] = useState("");
  const [label, setLabel] = useState("");
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const copyTimer = useRef(null);
  const inputRef = useRef(null);

  const normalized = normalizeUrl(url);
  const urlValid = isValidUrl(normalized);

  // Generate the QR whenever the normalized URL changes.
  useEffect(() => {
    let cancelled = false;

    if (!urlValid) {
      setQrDataUrl("");
      setError("");
      return;
    }

    QRCode.toDataURL(normalized, {
      width: 512,
      margin: 2,
      errorCorrectionLevel: "M",
      color: { dark: "#000000", light: "#ffffff" },
    })
      .then((dataUrl) => {
        if (!cancelled) {
          setQrDataUrl(dataUrl);
          setError("");
        }
      })
      .catch(() => {
        if (!cancelled) {
          setQrDataUrl("");
          setError("Could not generate the QR code. Try a shorter URL.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, [normalized, urlValid]);

  // Clean up the copy timer on unmount.
  useEffect(() => {
    return () => {
      if (copyTimer.current) clearTimeout(copyTimer.current);
    };
  }, []);

  const applyPreset = useCallback((prefix) => {
    setUrl((prev) => {
      const trimmed = prev.trim();
      // If the field is empty or still just a scheme, replace it with the preset.
      if (!trimmed || /^https?:\/\/?$/i.test(trimmed)) return prefix;
      // If the current value already starts with this preset, leave it.
      if (trimmed.toLowerCase().startsWith(prefix.toLowerCase())) return prev;
      // Otherwise, only apply the prefix when there's no scheme yet.
      if (/^[a-zA-Z][a-zA-Z0-9+.-]*:\/\//.test(trimmed)) return prev;
      return prefix;
    });
    // Focus the input so the user can keep typing their handle.
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, []);

  const handleCopy = useCallback(async () => {
    if (!normalized) return;
    try {
      await navigator.clipboard.writeText(normalized);
      setCopied(true);
      if (copyTimer.current) clearTimeout(copyTimer.current);
      copyTimer.current = setTimeout(() => setCopied(false), 1600);
    } catch {
      setError("Copy failed. You can select and copy the link manually.");
    }
  }, [normalized]);

  // Build a filename-safe slug from the label or the URL host.
  const buildFileSlug = useCallback(() => {
    const source =
      label.trim() ||
      (() => {
        try {
          return new URL(normalized).hostname.replace(/^www\./, "");
        } catch {
          return "code";
        }
      })();
    const slug = source
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
    return slug || "code";
  }, [label, normalized]);

  const handleDownload = useCallback(() => {
    if (!qrDataUrl) return;

    const trimmedLabel = label.trim();

    // Without a label, download the plain QR PNG directly.
    if (!trimmedLabel) {
      const a = document.createElement("a");
      a.href = qrDataUrl;
      a.download = `qr-${buildFileSlug()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      return;
    }

    // With a label, composite the QR and the caption onto a white canvas so the
    // downloaded PNG shows the label under the code.
    const img = new Image();
    img.onload = () => {
      const qrSize = 512;
      const pad = 40;
      const labelBand = 90;
      const canvas = document.createElement("canvas");
      canvas.width = qrSize + pad * 2;
      canvas.height = qrSize + pad * 2 + labelBand;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;

      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, pad, pad, qrSize, qrSize);

      // Draw the label, shrinking the font until it fits the width.
      ctx.fillStyle = "#111111";
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      let fontSize = 44;
      const maxWidth = qrSize + pad;
      ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      while (ctx.measureText(trimmedLabel).width > maxWidth && fontSize > 16) {
        fontSize -= 2;
        ctx.font = `600 ${fontSize}px system-ui, -apple-system, Segoe UI, Roboto, sans-serif`;
      }
      ctx.fillText(
        trimmedLabel,
        canvas.width / 2,
        qrSize + pad * 2 + labelBand / 2,
        maxWidth
      );

      const composed = canvas.toDataURL("image/png");
      const a = document.createElement("a");
      a.href = composed;
      a.download = `qr-${buildFileSlug()}.png`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
    };
    img.src = qrDataUrl;
  }, [qrDataUrl, label, buildFileSlug]);

  const showValidationError = url.trim().length > 0 && !urlValid;

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lib-url">
              Link or bio URL
            </label>
            <input
              id="lib-url"
              ref={inputRef}
              className="tool-input"
              type="text"
              inputMode="url"
              autoComplete="off"
              autoCapitalize="none"
              spellCheck="false"
              placeholder="e.g. linktr.ee/yourname"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
            />
            <p className="tool-note">
              No need to type https:// — we add it for you. Tap a preset below to
              start with a platform.
            </p>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <span className="tool-label">Quick fill</span>
            <div className="tool-actions" style={{ marginTop: 0 }}>
              {PRESETS.map((preset) => (
                <button
                  key={preset.name}
                  type="button"
                  className="btn"
                  onClick={() => applyPreset(preset.prefix)}
                >
                  {preset.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="lib-label">
              Label under the code (optional)
            </label>
            <input
              id="lib-label"
              className="tool-input"
              type="text"
              autoComplete="off"
              placeholder="e.g. Follow me on Instagram"
              value={label}
              onChange={(e) => setLabel(e.target.value)}
              maxLength={80}
            />
            <p className="tool-note">
              Shown beneath the QR code and baked into the downloaded PNG.
            </p>
          </div>
        </div>
      </div>

      {showValidationError && (
        <div className="tool-error">
          Enter a valid link, like linktr.ee/yourname or https://example.com.
        </div>
      )}

      {error && <div className="tool-error">{error}</div>}

      {urlValid && qrDataUrl && (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{normalized.length}</div>
              <div className="tool-stat-label">URL length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">512</div>
              <div className="tool-stat-label">PNG size (px)</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{label.trim() ? "Yes" : "No"}</div>
              <div className="tool-stat-label">Label</div>
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
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                maxWidth: "100%",
              }}
            >
              <img
                src={qrDataUrl}
                alt={`QR code for ${normalized}`}
                width={240}
                height={240}
                style={{ display: "block", width: 240, height: 240 }}
              />
              {label.trim() && (
                <div
                  style={{
                    marginTop: "10px",
                    maxWidth: "240px",
                    color: "#111111",
                    fontWeight: 600,
                    fontSize: "15px",
                    textAlign: "center",
                    wordBreak: "break-word",
                  }}
                >
                  {label.trim()}
                </div>
              )}
            </div>
          </div>

          <div className="tool-result" role="status" aria-live="polite">
            <div className="tool-result-label">Encoded link</div>
            <div
              className="tool-result-value"
              style={{ wordBreak: "break-all" }}
            >
              {normalized}
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
            <a
              className="btn btn-success"
              href={normalized}
              target="_blank"
              rel="noopener noreferrer"
            >
              Open link
            </a>
          </div>
        </>
      )}

      {!url && (
        <p className="tool-note">
          Enter your link-in-bio or any URL above to generate a scannable QR
          code. Print it, add it to a slide, or share it anywhere.
        </p>
      )}
    </div>
  );
}
