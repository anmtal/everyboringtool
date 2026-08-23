"use client";

import { useState, useEffect, useRef, useCallback } from "react";

// Target favicon sizes. label + filename + the HTML each one goes into.
const SIZES = [
  { size: 16, name: "favicon-16x16.png", caption: "Browser tab" },
  { size: 32, name: "favicon-32x32.png", caption: "Taskbar / bookmarks" },
  { size: 48, name: "favicon-48x48.png", caption: "Windows sites" },
  { size: 180, name: "apple-touch-icon.png", caption: "iOS home screen" },
  { size: 512, name: "icon-512x512.png", caption: "PWA / Android" },
];

// A short, transparent-friendly checkerboard so users can see PNG transparency.
const CHECKER =
  "repeating-conic-gradient(rgba(128,128,128,0.22) 0% 25%, transparent 0% 50%) 50% / 16px 16px";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

const SNIPPET = [
  '<link rel="icon" type="image/png" sizes="16x16" href="/favicon-16x16.png" />',
  '<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png" />',
  '<link rel="icon" type="image/png" sizes="48x48" href="/favicon-48x48.png" />',
  '<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png" />',
  '<link rel="icon" type="image/png" sizes="512x512" href="/icon-512x512.png" />',
].join("\n");

export default function FaviconGenerator() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [natural, setNatural] = useState(null); // { w, h }
  const [bgMode, setBgMode] = useState("transparent"); // transparent | color
  const [bgColor, setBgColor] = useState("#ffffff");
  const [icons, setIcons] = useState([]); // [{ size, name, caption, url, bytes }]
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);

  const imgRef = useRef(null); // loaded HTMLImageElement
  const previewUrlRef = useRef("");
  const iconUrlsRef = useRef([]); // object URLs to revoke

  const revokeIcons = useCallback(() => {
    iconUrlsRef.current.forEach((u) => URL.revokeObjectURL(u));
    iconUrlsRef.current = [];
  }, []);

  // Clean up object URLs on unmount.
  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      revokeIcons();
    };
  }, [revokeIcons]);

  // Draw the source image cover-fit and centered into a square canvas of `size`.
  const renderSize = useCallback(
    (image, size, useBg, color) => {
      return new Promise((resolve, reject) => {
        const canvas = document.createElement("canvas");
        canvas.width = size;
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          reject(new Error("Could not get a drawing context in this browser."));
          return;
        }

        if (useBg) {
          ctx.fillStyle = color;
          ctx.fillRect(0, 0, size, size);
        }

        const sw = image.naturalWidth;
        const sh = image.naturalHeight;
        if (!sw || !sh) {
          reject(new Error("This image has no readable dimensions."));
          return;
        }

        // Cover-fit: scale so the shorter side fills the square, crop the overflow.
        const scale = Math.max(size / sw, size / sh);
        const dw = sw * scale;
        const dh = sh * scale;
        const dx = (size - dw) / 2;
        const dy = (size - dh) / 2;

        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        ctx.drawImage(image, dx, dy, dw, dh);

        canvas.toBlob((blob) => {
          if (!blob) {
            reject(new Error("Could not export a PNG at " + size + "px."));
            return;
          }
          resolve(blob);
        }, "image/png");
      });
    },
    []
  );

  const generate = useCallback(
    async (image, useBg, color) => {
      setBusy(true);
      setError("");
      revokeIcons();
      try {
        const results = [];
        for (const spec of SIZES) {
          // eslint-disable-next-line no-await-in-loop
          const blob = await renderSize(image, spec.size, useBg, color);
          const url = URL.createObjectURL(blob);
          iconUrlsRef.current.push(url);
          results.push({ ...spec, url, bytes: blob.size });
        }
        setIcons(results);
      } catch (err) {
        revokeIcons();
        setIcons([]);
        setError(
          err && err.message ? err.message : "Something went wrong while generating favicons."
        );
      } finally {
        setBusy(false);
      }
    },
    [renderSize, revokeIcons]
  );

  const handleFile = useCallback(
    (file) => {
      if (!file) return;
      if (!file.type || !file.type.startsWith("image/")) {
        setError("Please choose an image file (PNG, JPG, SVG, WebP, or similar).");
        return;
      }

      setError("");
      revokeIcons();
      setIcons([]);
      setNatural(null);
      imgRef.current = null;

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const objectUrl = URL.createObjectURL(file);
      previewUrlRef.current = objectUrl;
      setPreviewUrl(objectUrl);
      setFileName(file.name || "image");

      const image = new Image();
      image.onload = () => {
        imgRef.current = image;
        setNatural({ w: image.naturalWidth, h: image.naturalHeight });
        generate(image, bgMode === "color", bgColor);
      };
      image.onerror = () => {
        imgRef.current = null;
        setNatural(null);
        setError("This file could not be read as an image. It may be corrupt or unsupported.");
      };
      image.src = objectUrl;
    },
    [bgMode, bgColor, generate, revokeIcons]
  );

  const onInputChange = (e) => {
    const file = e.target.files && e.target.files[0];
    handleFile(file);
    e.target.value = ""; // allow re-selecting the same file
  };

  const onDrop = (e) => {
    e.preventDefault();
    const file = e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0];
    handleFile(file);
  };

  const onBgModeChange = (e) => {
    const mode = e.target.value;
    setBgMode(mode);
    if (imgRef.current) generate(imgRef.current, mode === "color", bgColor);
  };

  const onBgColorChange = (e) => {
    const color = e.target.value;
    setBgColor(color);
    if (imgRef.current && bgMode === "color") generate(imgRef.current, true, color);
  };

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(SNIPPET);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      setCopied(false);
    }
  }

  const totalBytes = icons.reduce((sum, ic) => sum + (ic.bytes || 0), 0);
  const isSmall = natural && (natural.w < 512 || natural.h < 512);

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="fg-file">
          Choose an image
        </label>
        <label
          htmlFor="fg-file"
          className="dropzone"
          onDragOver={(e) => e.preventDefault()}
          onDrop={onDrop}
          style={{ cursor: "pointer", display: "block" }}
        >
          <div className="dropzone-title">Drop an image here or click to browse</div>
          <div className="dropzone-sub">
            A square PNG of 512×512 or larger works best. SVG, JPG, and WebP are fine too.
          </div>
        </label>
        <input
          id="fg-file"
          className="tool-input"
          type="file"
          accept="image/*"
          onChange={onInputChange}
          style={{ marginTop: "0.5rem" }}
        />
        <p className="tool-note">
          Everything runs in your browser — your image is never uploaded to a server.
        </p>
      </div>

      {previewUrl ? (
        <div className="tool-fields">
          <div className="tool-row">
            <div className="tool-field">
              <label className="tool-label" htmlFor="fg-bg">
                Background
              </label>
              <select
                id="fg-bg"
                className="tool-select"
                value={bgMode}
                onChange={onBgModeChange}
              >
                <option value="transparent">Keep transparency</option>
                <option value="color">Fill with a color</option>
              </select>
              <p className="tool-note">
                iOS home-screen icons show no transparency, so a solid color is often safer there.
              </p>
            </div>
            {bgMode === "color" ? (
              <div className="tool-field">
                <label className="tool-label" htmlFor="fg-color">
                  Background color
                </label>
                <input
                  id="fg-color"
                  className="tool-input"
                  type="color"
                  value={bgColor}
                  onChange={onBgColorChange}
                  style={{ height: "42px", padding: "4px" }}
                />
              </div>
            ) : null}
          </div>
        </div>
      ) : null}

      {error ? (
        <p className="tool-error" role="alert">
          {error}
        </p>
      ) : null}

      {natural ? (
        <div className="tool-stat-grid">
          <div className="tool-stat">
            <div className="tool-stat-num">
              {natural.w} × {natural.h}
            </div>
            <div className="tool-stat-label">Source (px)</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{icons.length}</div>
            <div className="tool-stat-label">Icons generated</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{totalBytes ? formatBytes(totalBytes) : "—"}</div>
            <div className="tool-stat-label">Total size</div>
          </div>
          <div className="tool-stat">
            <div className="tool-stat-num">{isSmall ? "Upscaled" : "Sharp"}</div>
            <div className="tool-stat-label">512px quality</div>
          </div>
        </div>
      ) : null}

      {isSmall && icons.length > 0 ? (
        <p className="tool-note">
          Your image is smaller than 512×512, so the largest icons are scaled up and may look soft.
          A larger source gives crisper results.
        </p>
      ) : null}

      {busy ? <p className="tool-note">Generating favicons…</p> : null}

      {icons.length > 0 ? (
        <>
          <div className="tool-result">
            <div className="tool-result-label">Previews</div>
            <div className="tool-result-value">
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: "16px",
                  alignItems: "flex-end",
                }}
              >
                {icons.map((ic) => (
                  <div
                    key={ic.size}
                    style={{ textAlign: "center", maxWidth: "128px" }}
                  >
                    <div
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        justifyContent: "center",
                        padding: "8px",
                        borderRadius: "8px",
                        border: "1px solid rgba(128,128,128,0.35)",
                        background: CHECKER,
                      }}
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={ic.url}
                        alt={`${ic.size}×${ic.size} favicon preview`}
                        width={Math.min(ic.size, 96)}
                        height={Math.min(ic.size, 96)}
                        style={{
                          display: "block",
                          width: Math.min(ic.size, 96),
                          height: Math.min(ic.size, 96),
                          imageRendering: ic.size <= 48 ? "pixelated" : "auto",
                        }}
                      />
                    </div>
                    <div
                      style={{
                        marginTop: "6px",
                        fontSize: "0.8rem",
                        fontWeight: 600,
                      }}
                    >
                      {ic.size}×{ic.size}
                    </div>
                    <div style={{ fontSize: "0.72rem", opacity: 0.7 }}>{ic.caption}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="tool-actions">
            {icons.map((ic) => (
              <a
                key={ic.size}
                className="btn"
                href={ic.url}
                download={ic.name}
                role="button"
              >
                ↓ {ic.size}px
              </a>
            ))}
          </div>

          <div className="tool-result">
            <div className="tool-result-label">HTML to add inside your &lt;head&gt;</div>
            <div className="tool-result-value">
              <pre className="tool-output">{SNIPPET}</pre>
            </div>
          </div>

          <div className="tool-actions">
            <button type="button" className="btn btn-primary" onClick={handleCopy}>
              {copied ? "Copied!" : "Copy HTML snippet"}
            </button>
          </div>

          <p className="tool-note">
            Save each PNG to your site&apos;s root folder using the filenames shown, then paste the
            snippet above into your page&apos;s &lt;head&gt;.
          </p>
        </>
      ) : null}

      {!previewUrl && !busy && !error ? (
        <p className="tool-note">
          Upload an image to create favicons at 16, 32, 48, 180, and 512 pixels — all at once.
        </p>
      ) : null}
    </div>
  );
}
