"use client";

import { useMemo, useState } from "react";
import { copyText } from "../../lib/copyText";

const EXAMPLE =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36";

function firstMatch(ua, patterns) {
  for (const [re, name] of patterns) {
    const m = ua.match(re);
    if (m) return { name, version: m[1] || "" };
  }
  return null;
}

// Detect the browser. Order matters: more specific brands must come before the
// engine-family fallbacks (Chrome/Safari) they masquerade as.
function detectBrowser(ua) {
  const patterns = [
    [/Edg(?:iOS|A)?\/([\d.]+)/, "Microsoft Edge"],
    [/Edge\/([\d.]+)/, "Microsoft Edge (Legacy)"],
    [/OPR\/([\d.]+)/, "Opera"],
    [/Opera[ /]([\d.]+)/, "Opera"],
    [/OPT\/([\d.]+)/, "Opera Touch"],
    [/SamsungBrowser\/([\d.]+)/, "Samsung Internet"],
    [/YaBrowser\/([\d.]+)/, "Yandex Browser"],
    [/Vivaldi\/([\d.]+)/, "Vivaldi"],
    [/Brave\/([\d.]+)/, "Brave"],
    [/UCBrowser\/([\d.]+)/, "UC Browser"],
    [/DuckDuckGo\/([\d.]+)/, "DuckDuckGo"],
    [/FxiOS\/([\d.]+)/, "Firefox (iOS)"],
    [/CriOS\/([\d.]+)/, "Chrome (iOS)"],
    [/EdgiOS\/([\d.]+)/, "Microsoft Edge (iOS)"],
    [/Firefox\/([\d.]+)/, "Firefox"],
    [/Seamonkey\/([\d.]+)/, "SeaMonkey"],
    [/Chromium\/([\d.]+)/, "Chromium"],
    [/Chrome\/([\d.]+)/, "Chrome"],
    // Safari reports its version separately from the WebKit build number.
    [/Version\/([\d.]+).*Safari\//, "Safari"],
    [/MSIE ([\d.]+)/, "Internet Explorer"],
    [/Trident\/.*rv:([\d.]+)/, "Internet Explorer"],
  ];
  return firstMatch(ua, patterns);
}

// Detect the rendering engine.
function detectEngine(ua) {
  const patterns = [
    [/EdgeHTML\/([\d.]+)/, "EdgeHTML"],
    [/Gecko\/([\d.]+)/, "Gecko"],
    [/rv:([\d.]+).*Gecko/, "Gecko"],
    [/AppleWebKit\/([\d.]+)/, "WebKit"],
    [/Presto\/([\d.]+)/, "Presto"],
    [/Trident\/([\d.]+)/, "Trident"],
    [/KHTML\/([\d.]+)/, "KHTML"],
  ];
  // Blink is WebKit-based but reports a Chrome token; call it out explicitly.
  if (/Chrome\/|Chromium\/|Edg\//.test(ua) && /AppleWebKit/.test(ua)) {
    const wk = ua.match(/AppleWebKit\/([\d.]+)/);
    return { name: "Blink", version: wk ? wk[1] : "" };
  }
  return firstMatch(ua, patterns);
}

// Detect the operating system and its version.
function detectOS(ua) {
  let m;
  if ((m = ua.match(/Windows NT ([\d.]+)/))) {
    const map = {
      "10.0": "10 / 11",
      "6.3": "8.1",
      "6.2": "8",
      "6.1": "7",
      "6.0": "Vista",
      "5.1": "XP",
      "5.2": "XP x64",
    };
    return { name: "Windows", version: map[m[1]] || m[1] };
  }
  if (/Windows Phone/.test(ua)) {
    const v = ua.match(/Windows Phone(?: OS)? ([\d.]+)/);
    return { name: "Windows Phone", version: v ? v[1] : "" };
  }
  if ((m = ua.match(/iPhone OS ([\d_]+)/)) || (m = ua.match(/CPU OS ([\d_]+)/))) {
    return { name: "iOS", version: m[1].replace(/_/g, ".") };
  }
  if (/iPad|iPhone|iPod/.test(ua)) {
    return { name: "iOS", version: "" };
  }
  if ((m = ua.match(/Android ([\d.]+)/))) {
    return { name: "Android", version: m[1] };
  }
  if (/Android/.test(ua)) {
    return { name: "Android", version: "" };
  }
  if ((m = ua.match(/Mac OS X ([\d_]+)/))) {
    return { name: "macOS", version: m[1].replace(/_/g, ".") };
  }
  if (/Mac OS X|Macintosh/.test(ua)) {
    return { name: "macOS", version: "" };
  }
  if (/CrOS/.test(ua)) {
    return { name: "Chrome OS", version: "" };
  }
  if (/Ubuntu/.test(ua)) return { name: "Ubuntu", version: "" };
  if (/Fedora/.test(ua)) return { name: "Fedora", version: "" };
  if (/Linux/.test(ua)) return { name: "Linux", version: "" };
  return null;
}

// Guess the device type and, where possible, brand/model.
function detectDevice(ua) {
  const isTablet =
    /iPad/.test(ua) ||
    (/Android/.test(ua) && !/Mobile/.test(ua)) ||
    /Tablet|Kindle|Silk|PlayBook/.test(ua);
  const isMobile =
    !isTablet &&
    /Mobile|iPhone|iPod|Android.*Mobile|Windows Phone|BlackBerry|BB10|Opera Mini|IEMobile/.test(
      ua
    );

  let type = "Desktop";
  if (isTablet) type = "Tablet";
  else if (isMobile) type = "Mobile";
  if (/SmartTV|Smart-TV|TV|AppleTV|GoogleTV|HbbTV/.test(ua)) type = "TV";
  if (/PlayStation|Xbox|Nintendo/.test(ua)) type = "Console";

  let model = "";
  let vendor = "";
  let m;
  if (/iPhone/.test(ua)) {
    vendor = "Apple";
    model = "iPhone";
  } else if (/iPad/.test(ua)) {
    vendor = "Apple";
    model = "iPad";
  } else if (/iPod/.test(ua)) {
    vendor = "Apple";
    model = "iPod";
  } else if (/Macintosh/.test(ua)) {
    vendor = "Apple";
    model = "Mac";
  } else if ((m = ua.match(/;\s?([^;)]*(?:SM-|Pixel|Nexus|OnePlus)[^;)]*)(?:Build|;|\))/))) {
    model = m[1].trim();
    if (/SM-/.test(model)) vendor = "Samsung";
    else if (/Pixel|Nexus/.test(model)) vendor = "Google";
    else if (/OnePlus/.test(model)) vendor = "OnePlus";
  }
  return { type, model, vendor };
}

// Distinguish real browsers from bots, crawlers and libraries.
function detectBot(ua) {
  const patterns = [
    [/Googlebot(?:-[A-Za-z]+)?\/?([\d.]*)/, "Googlebot"],
    [/AdsBot-Google/, "AdsBot (Google)"],
    [/bingbot\/([\d.]*)/, "Bingbot"],
    [/Slurp/, "Yahoo Slurp"],
    [/DuckDuckBot/, "DuckDuckBot"],
    [/Baiduspider/, "Baiduspider"],
    [/YandexBot\/([\d.]*)/, "YandexBot"],
    [/facebookexternalhit/, "Facebook Crawler"],
    [/Twitterbot/, "Twitterbot"],
    [/LinkedInBot/, "LinkedInBot"],
    [/Applebot\/([\d.]*)/, "Applebot"],
    [/AhrefsBot\/([\d.]*)/, "AhrefsBot"],
    [/SemrushBot/, "SemrushBot"],
    [/GPTBot\/([\d.]*)/, "GPTBot (OpenAI)"],
    [/ClaudeBot\/([\d.]*)/, "ClaudeBot (Anthropic)"],
    [/CCBot\/([\d.]*)/, "CCBot (Common Crawl)"],
    [/PerplexityBot/, "PerplexityBot"],
    [/curl\/([\d.]*)/, "curl"],
    [/Wget\/([\d.]*)/, "Wget"],
    [/python-requests\/([\d.]*)/, "python-requests"],
    [/axios\/([\d.]*)/, "axios"],
    [/PostmanRuntime\/([\d.]*)/, "Postman"],
    [/\bbot\b|crawler|spider|crawling/i, "Unknown bot / crawler"],
  ];
  return firstMatch(ua, patterns);
}

function labelVersion(obj) {
  if (!obj) return "Not detected";
  return obj.version ? `${obj.name} ${obj.version}` : obj.name;
}

export default function UserAgentParser() {
  const [ua, setUa] = useState(EXAMPLE);
  const [copied, setCopied] = useState(false);
  const [useMine, setUseMine] = useState(false);

  const parsed = useMemo(() => {
    const trimmed = ua.trim();
    if (!trimmed) return null;
    const bot = detectBot(trimmed);
    return {
      browser: detectBrowser(trimmed),
      engine: detectEngine(trimmed),
      os: detectOS(trimmed),
      device: detectDevice(trimmed),
      bot,
    };
  }, [ua]);

  function loadMine() {
    if (typeof navigator !== "undefined" && navigator.userAgent) {
      setUa(navigator.userAgent);
      setUseMine(true);
      setCopied(false);
    }
  }

  function loadExample() {
    setUa(EXAMPLE);
    setUseMine(false);
    setCopied(false);
  }

  function handleChange(e) {
    setUa(e.target.value);
    setUseMine(false);
    setCopied(false);
  }

  const jsonText = useMemo(() => {
    if (!parsed) return "";
    const out = {
      browser: {
        name: parsed.browser ? parsed.browser.name : null,
        version: parsed.browser ? parsed.browser.version || null : null,
      },
      engine: {
        name: parsed.engine ? parsed.engine.name : null,
        version: parsed.engine ? parsed.engine.version || null : null,
      },
      os: {
        name: parsed.os ? parsed.os.name : null,
        version: parsed.os ? parsed.os.version || null : null,
      },
      device: {
        type: parsed.device.type,
        vendor: parsed.device.vendor || null,
        model: parsed.device.model || null,
      },
      bot: parsed.bot ? parsed.bot.name : null,
    };
    return JSON.stringify(out, null, 2);
  }, [parsed]);

  async function handleCopy() {
    if (!jsonText) return;
    try {
      await copyText(jsonText);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (e) {
      setCopied(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ua-input">
            User agent string
          </label>
          <textarea
            id="ua-input"
            className="tool-textarea"
            value={ua}
            onChange={handleChange}
            placeholder="Paste a User-Agent string here…"
            rows={4}
            spellCheck={false}
          />
        </div>
      </div>

      <div className="tool-actions">
        <button className="btn" type="button" onClick={loadMine}>
          Use my browser
        </button>
        <button className="btn" type="button" onClick={loadExample}>
          Load example
        </button>
      </div>

      {parsed ? (
        <div role="status" aria-live="polite">
          {parsed.bot ? (
            <div className="tool-result">
              <span className="tool-result-label">Detected as bot / non-browser</span>
              <span className="tool-result-value">{labelVersion(parsed.bot)}</span>
            </div>
          ) : null}

          <div className="tool-stat-grid">
            <div className="tool-stat">
              <span className="tool-stat-num">
                {parsed.browser ? parsed.browser.name : "—"}
              </span>
              <span className="tool-stat-label">
                Browser{parsed.browser && parsed.browser.version ? ` ${parsed.browser.version}` : ""}
              </span>
            </div>
            <div className="tool-stat">
              <span className="tool-stat-num">
                {parsed.os ? parsed.os.name : "—"}
              </span>
              <span className="tool-stat-label">
                OS{parsed.os && parsed.os.version ? ` ${parsed.os.version}` : ""}
              </span>
            </div>
            <div className="tool-stat">
              <span className="tool-stat-num">
                {parsed.engine ? parsed.engine.name : "—"}
              </span>
              <span className="tool-stat-label">
                Engine{parsed.engine && parsed.engine.version ? ` ${parsed.engine.version}` : ""}
              </span>
            </div>
            <div className="tool-stat">
              <span className="tool-stat-num">{parsed.device.type}</span>
              <span className="tool-stat-label">
                Device{parsed.device.model ? ` · ${parsed.device.model}` : ""}
              </span>
            </div>
          </div>

          <div className="tool-result">
            <span className="tool-result-label">Browser</span>
            <span className="tool-result-value">{labelVersion(parsed.browser)}</span>
          </div>
          <div className="tool-result">
            <span className="tool-result-label">Rendering engine</span>
            <span className="tool-result-value">{labelVersion(parsed.engine)}</span>
          </div>
          <div className="tool-result">
            <span className="tool-result-label">Operating system</span>
            <span className="tool-result-value">{labelVersion(parsed.os)}</span>
          </div>
          <div className="tool-result">
            <span className="tool-result-label">Device type</span>
            <span className="tool-result-value">{parsed.device.type}</span>
          </div>
          {parsed.device.vendor ? (
            <div className="tool-result">
              <span className="tool-result-label">Device vendor</span>
              <span className="tool-result-value">{parsed.device.vendor}</span>
            </div>
          ) : null}
          {parsed.device.model ? (
            <div className="tool-result">
              <span className="tool-result-label">Device model</span>
              <span className="tool-result-value">{parsed.device.model}</span>
            </div>
          ) : null}

          <div className="tool-field">
            <div className="tool-actions">
              <button
                className={copied ? "btn btn-success" : "btn btn-primary"}
                type="button"
                onClick={handleCopy}
              >
                {copied ? "Copied!" : "Copy JSON"}
              </button>
            </div>
            <label className="tool-label" htmlFor="ua-json">
              Parsed result (JSON)
            </label>
            <pre className="tool-output" id="ua-json">
              {jsonText}
            </pre>
          </div>

          <p className="tool-note">
            {useMine
              ? "This is your current browser's User-Agent string, read locally. Nothing was sent anywhere."
              : "Detection uses pattern matching on the raw string. User-Agent values can be spoofed or frozen by the browser, so treat results as a best-effort guess."}
          </p>
        </div>
      ) : (
        <p className="tool-note">
          Paste a User-Agent string above, or click “Use my browser”, to break it
          down into browser, engine, operating system and device.
        </p>
      )}
    </div>
  );
}
