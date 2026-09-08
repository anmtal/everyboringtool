"use client";

import { useEffect, useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

// A short, stable hash so we can produce a "canvas fingerprint" and an overall
// fingerprint id without pulling in any library. SHA-256 via WebCrypto.
async function sha256Hex(str) {
  try {
    const buf = await crypto.subtle.digest(
      "SHA-256",
      new TextEncoder().encode(str)
    );
    return Array.from(new Uint8Array(buf))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("");
  } catch (e) {
    // Fallback (e.g. non-secure context): simple DJB2 hash, clearly non-crypto.
    let h = 5381;
    for (let i = 0; i < str.length; i++) {
      h = (h * 33) ^ str.charCodeAt(i);
    }
    return (h >>> 0).toString(16).padStart(8, "0");
  }
}

// Draw text + shapes to a canvas and read the pixels back. Tiny rendering
// differences between GPUs, drivers and OSes make this a classic fingerprint.
function getCanvasSignal() {
  try {
    const canvas = document.createElement("canvas");
    canvas.width = 240;
    canvas.height = 60;
    const ctx = canvas.getContext("2d");
    if (!ctx) return "no-2d-context";
    ctx.textBaseline = "top";
    ctx.font = "16px 'Arial'";
    ctx.fillStyle = "#f60";
    ctx.fillRect(2, 2, 120, 24);
    ctx.fillStyle = "#069";
    ctx.fillText("EveryBoringTool \u{1F510}", 4, 4);
    ctx.fillStyle = "rgba(102,204,0,0.7)";
    ctx.fillText("EveryBoringTool \u{1F510}", 6, 22);
    ctx.beginPath();
    ctx.arc(180, 30, 18, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fill();
    return canvas.toDataURL();
  } catch (e) {
    return "canvas-blocked";
  }
}

// WebGL vendor/renderer (often the GPU name) is highly identifying.
function getWebglSignal() {
  try {
    const canvas = document.createElement("canvas");
    const gl =
      canvas.getContext("webgl") || canvas.getContext("experimental-webgl");
    if (!gl) return { vendor: "no-webgl", renderer: "no-webgl" };
    const dbg = gl.getExtension("WEBGL_debug_renderer_info");
    return {
      vendor: dbg
        ? gl.getParameter(dbg.UNMASKED_VENDOR_WEBGL)
        : gl.getParameter(gl.VENDOR),
      renderer: dbg
        ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL)
        : gl.getParameter(gl.RENDERER),
    };
  } catch (e) {
    return { vendor: "webgl-error", renderer: "webgl-error" };
  }
}

// Detect which of a common font list actually renders, using width measurement.
function getFontsSignal() {
  try {
    const base = ["monospace", "sans-serif", "serif"];
    const testFonts = [
      "Arial",
      "Verdana",
      "Times New Roman",
      "Courier New",
      "Georgia",
      "Garamond",
      "Comic Sans MS",
      "Trebuchet MS",
      "Impact",
      "Tahoma",
      "Helvetica",
      "Calibri",
      "Cambria",
      "Consolas",
      "Segoe UI",
      "Roboto",
      "Menlo",
      "Monaco",
    ];
    const text = "mmmmmmmmmmlli";
    const size = "72px";
    const span = document.createElement("span");
    span.style.position = "absolute";
    span.style.left = "-9999px";
    span.style.fontSize = size;
    span.textContent = text;
    document.body.appendChild(span);

    const baseSizes = {};
    for (const b of base) {
      span.style.fontFamily = b;
      baseSizes[b] = { w: span.offsetWidth, h: span.offsetHeight };
    }

    const detected = [];
    for (const font of testFonts) {
      let matched = false;
      for (const b of base) {
        span.style.fontFamily = `'${font}',${b}`;
        if (
          span.offsetWidth !== baseSizes[b].w ||
          span.offsetHeight !== baseSizes[b].h
        ) {
          matched = true;
          break;
        }
      }
      if (matched) detected.push(font);
    }
    document.body.removeChild(span);
    return detected;
  } catch (e) {
    return [];
  }
}

function safe(fn, fallback) {
  try {
    const v = fn();
    return v === undefined || v === null ? fallback : v;
  } catch (e) {
    return fallback;
  }
}

export default function BrowserFingerprint() {
  const [data, setData] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function run() {
      const nav = typeof navigator !== "undefined" ? navigator : {};
      const scr = typeof screen !== "undefined" ? screen : {};

      const canvasSignal = getCanvasSignal();
      const webgl = getWebglSignal();
      const fonts = getFontsSignal();
      const canvasHash = (await sha256Hex(canvasSignal)).slice(0, 16);

      const tz = safe(
        () => Intl.DateTimeFormat().resolvedOptions().timeZone,
        "unknown"
      );

      const attributes = {
        "User agent": safe(() => nav.userAgent, "unknown"),
        Platform: safe(() => nav.platform, "unknown"),
        Languages: safe(
          () => (nav.languages || [nav.language]).join(", "),
          "unknown"
        ),
        "Screen resolution": safe(
          () => `${scr.width} × ${scr.height}`,
          "unknown"
        ),
        "Available screen": safe(
          () => `${scr.availWidth} × ${scr.availHeight}`,
          "unknown"
        ),
        "Color depth": safe(() => `${scr.colorDepth}-bit`, "unknown"),
        "Device pixel ratio": safe(
          () => String(window.devicePixelRatio),
          "unknown"
        ),
        Timezone: tz,
        "Timezone offset": safe(
          () => `${-new Date().getTimezoneOffset()} min`,
          "unknown"
        ),
        "CPU cores": safe(
          () => String(nav.hardwareConcurrency),
          "not reported"
        ),
        "Device memory": safe(
          () => (nav.deviceMemory ? `${nav.deviceMemory} GB` : "not reported"),
          "not reported"
        ),
        "Touch points": safe(() => String(nav.maxTouchPoints), "0"),
        "Cookies enabled": safe(
          () => (nav.cookieEnabled ? "Yes" : "No"),
          "unknown"
        ),
        "Do Not Track": safe(
          () => nav.doNotTrack || window.doNotTrack || "not set",
          "not set"
        ),
        "GPU vendor": String(webgl.vendor),
        "GPU renderer": String(webgl.renderer),
        "Canvas hash": canvasHash,
        "Detected fonts": fonts.length ? fonts.join(", ") : "none detected",
        "Font count": String(fonts.length),
      };

      // Build the fingerprint from the most stable, identifying signals.
      const fpSource = [
        attributes["User agent"],
        attributes.Platform,
        attributes.Languages,
        attributes["Screen resolution"],
        attributes["Color depth"],
        attributes["Device pixel ratio"],
        attributes.Timezone,
        attributes["CPU cores"],
        attributes["Device memory"],
        attributes["GPU vendor"],
        attributes["GPU renderer"],
        canvasHash,
        fonts.join(","),
      ].join("|");

      const fpHash = await sha256Hex(fpSource);

      if (!cancelled) {
        setData({ attributes, fpHash, fontCount: fonts.length });
      }
    }

    run();
    return () => {
      cancelled = true;
    };
  }, []);

  // A rough entropy / uniqueness read based on how many signals are unusual.
  const uniqueness = useMemo(() => {
    if (!data) return null;
    const a = data.attributes;
    let notes = [];
    if (data.fontCount >= 10)
      notes.push("a rich set of installed fonts stands out");
    if (
      a["GPU renderer"] &&
      a["GPU renderer"] !== "no-webgl" &&
      a["GPU renderer"] !== "webgl-error"
    )
      notes.push("your GPU model is exposed via WebGL");
    if (a["Canvas hash"] && a["Canvas hash"].length === 16)
      notes.push("your canvas rendering is measurable");
    if (a["Device memory"] !== "not reported")
      notes.push("device memory is reported");
    return notes;
  }, [data]);

  async function handleCopy() {
    if (!data) return;
    const lines = Object.entries(data.attributes).map(
      ([k, v]) => `${k}: ${v}`
    );
    lines.unshift(`Fingerprint ID: ${data.fpHash}`);
    try {
      await copyText(lines.join("\n"));
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  if (!data) {
    return (
      <div className="tool">
        <p className="tool-note">
          Reading your browser signals… this runs entirely on your device
          and nothing is uploaded.
        </p>
      </div>
    );
  }

  return (
    <div className="tool">
      <div className="tool-result" role="status" aria-live="polite">
        <span className="tool-result-label">Your browser fingerprint ID</span>
        <span className="tool-result-value">{data.fpHash}</span>
      </div>

      <div className="tool-actions">
        <button
          className={copied ? "btn btn-success" : "btn btn-primary"}
          type="button"
          onClick={handleCopy}
        >
          {copied ? "Copied!" : "Copy full report"}
        </button>
      </div>

      <p className="tool-note">
        This ID is a SHA-256 hash of the signals below. If it stays the same
        across page reloads, those signals are stable enough to help sites
        recognize this browser even without cookies. Open this page in a
        different browser or an incognito window with extensions off to see the
        ID change.
      </p>

      <div className="tool-stat-grid">
        <div className="tool-stat">
          <span className="tool-stat-num">
            {Object.keys(data.attributes).length}
          </span>
          <span className="tool-stat-label">Signals collected</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-num">{data.fontCount}</span>
          <span className="tool-stat-label">Fonts detected</span>
        </div>
        <div className="tool-stat">
          <span className="tool-stat-num">
            {data.attributes["CPU cores"]}
          </span>
          <span className="tool-stat-label">CPU cores</span>
        </div>
      </div>

      {uniqueness && uniqueness.length > 0 ? (
        <p className="tool-note">
          What makes this browser stand out: {uniqueness.join("; ")}.
        </p>
      ) : null}

      <div className="tool-field">
        <span className="tool-result-label">All collected signals</span>
        <pre className="tool-output">
          {Object.entries(data.attributes)
            .map(([k, v]) => `${k}: ${v}`)
            .join("\n")}
        </pre>
      </div>

      <p className="tool-note">
        Everything is read with standard browser APIs and computed locally in
        your browser. No data leaves your device, nothing is stored, and there
        is no sign-up.
      </p>
    </div>
  );
}
