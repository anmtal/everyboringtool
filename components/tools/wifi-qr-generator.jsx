"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";
import QRCode from "qrcode";

// Escape the WIFI: payload special characters (\ ; , : ") with a backslash.
function escapeWifi(value) {
  return String(value).replace(/([\\;,:"])/g, "\\$1");
}

function buildPayload({ ssid, password, encryption, hidden }) {
  const s = escapeWifi(ssid);
  const h = hidden ? "true" : "false";
  if (encryption === "nopass") {
    // Open network: type nopass and no password field.
    return `WIFI:T:nopass;S:${s};H:${h};;`;
  }
  const p = escapeWifi(password);
  return `WIFI:T:${encryption};S:${s};P:${p};H:${h};;`;
}

function slugify(value) {
  const cleaned = String(value)
    .trim()
    .replace(/[^a-z0-9]+/gi, "-")
    .replace(/^-+|-+$/g, "");
  return cleaned || "wifi";
}

export default function WifiQrGenerator() {
  const [ssid, setSsid] = useState("");
  const [password, setPassword] = useState("");
  const [encryption, setEncryption] = useState("WPA");
  const [hidden, setHidden] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [dataUrl, setDataUrl] = useState("");
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const trimmedSsid = ssid.trim();
  const isOpen = encryption === "nopass";

  const payload = useMemo(
    () => buildPayload({ ssid, password, encryption, hidden }),
    [ssid, password, encryption, hidden]
  );

  useEffect(() => {
    let cancelled = false;

    // Nothing meaningful to encode until there is a network name.
    if (!trimmedSsid) {
      setDataUrl("");
      setError("");
      return;
    }

    QRCode.toDataURL(payload, { width: 320, margin: 2 })
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
  }, [payload, trimmedSsid]);

  function handleDownload() {
    if (!dataUrl) return;
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${slugify(trimmedSsid)}-wifi-qr.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  async function handleCopyPayload() {
    if (!trimmedSsid) return;
    try {
      await copyText(payload);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  function handleClear() {
    setSsid("");
    setPassword("");
    setEncryption("WPA");
    setHidden(false);
    setShowPassword(false);
    setDataUrl("");
    setError("");
    setCopied(false);
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="wifi-ssid">
            Network name (SSID)
          </label>
          <input
            className="tool-input"
            id="wifi-ssid"
            type="text"
            value={ssid}
            onChange={(e) => setSsid(e.target.value)}
            placeholder="MyHomeWiFi"
            autoComplete="off"
          />
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wifi-encryption">
              Encryption
            </label>
            <select
              className="tool-select"
              id="wifi-encryption"
              value={encryption}
              onChange={(e) => setEncryption(e.target.value)}
            >
              <option value="WPA">WPA/WPA2</option>
              <option value="WEP">WEP</option>
              <option value="nopass">None (open)</option>
            </select>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="wifi-password">
              Password
            </label>
            <input
              className="tool-input"
              id="wifi-password"
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder={isOpen ? "Not needed for open networks" : "••••••••"}
              autoComplete="off"
              disabled={isOpen}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="wifi-show-password">
              <input
                id="wifi-show-password"
                type="checkbox"
                checked={showPassword}
                onChange={(e) => setShowPassword(e.target.checked)}
                disabled={isOpen}
                style={{ marginRight: "0.5rem" }}
              />
              Show password
            </label>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="wifi-hidden">
              <input
                id="wifi-hidden"
                type="checkbox"
                checked={hidden}
                onChange={(e) => setHidden(e.target.checked)}
                style={{ marginRight: "0.5rem" }}
              />
              Hidden network
            </label>
          </div>
        </div>
      </div>

      {error ? <p className="tool-error">{error}</p> : null}

      {trimmedSsid && dataUrl ? (
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
            <div className="tool-result-label">Your Wi-Fi QR code</div>
            <img
              src={dataUrl}
              alt={`QR code to join the Wi-Fi network ${trimmedSsid}`}
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
              onClick={handleCopyPayload}
            >
              {copied ? "Copied!" : "Copy payload"}
            </button>
            <button className="btn" type="button" onClick={handleClear}>
              Clear
            </button>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="wifi-payload">
              Encoded payload
            </label>
            <pre className="tool-output" id="wifi-payload">
              {payload}
            </pre>
          </div>

          <p className="tool-note">
            Scanning this QR code with a phone camera will prompt it to join the
            Wi-Fi network directly. Print it for guests, or share the image.
            {isOpen
              ? " This is an open network, so no password is encoded."
              : null}
          </p>
        </>
      ) : (
        <p className="tool-note">
          Enter your network name above to generate a scannable Wi-Fi QR code.
          Everything is built right here in your browser — your SSID and
          password never leave your device.
        </p>
      )}
    </div>
  );
}
