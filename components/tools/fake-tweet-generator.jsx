"use client";

import { useEffect, useMemo, useRef, useState } from "react";

// -------------------------------------------------------------------------
// Fake Tweet / social-post card generator.
//
// The card is built as a single self-contained HTML string with fully inline
// styles. That exact same markup is used two ways:
//   1. Live preview  -> injected via dangerouslySetInnerHTML.
//   2. PNG export     -> wrapped in an <svg><foreignObject> and rasterized to
//                        a <canvas>, so what you see is what you download.
// Keeping one builder for both guarantees the preview and the PNG never drift.
// -------------------------------------------------------------------------

const FONT =
  "-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif";

// Twitter/X-style glyph paths (viewBox 0 0 24 24).
const ICON_REPLY =
  "M1.751 10c0-4.42 3.584-8 8.005-8h4.366c4.49 0 8.129 3.64 8.129 8.13 0 2.96-1.607 5.68-4.196 7.11l-8.054 4.46v-3.69h-.067C5.35 18.01 1.751 14.4 1.751 10zm8.005-6c-3.317 0-6.005 2.69-6.005 6 0 3.34 2.749 6.02 6.083 5.99l.386-.01h1.581v2.3l5.06-2.8c1.988-1.1 3.221-3.2 3.221-5.48 0-3.39-2.741-6.13-6.129-6.13H9.756z";
const ICON_REPOST =
  "M4.5 3.88l4.432 4.14-1.364 1.46L5.5 7.55V16c0 1.1.896 2 2 2H13v2H7.5c-2.209 0-4-1.79-4-4V7.55L1.432 9.48.068 8.02 4.5 3.88zM16.5 6H11V4h5.5c2.209 0 4 1.79 4 4v8.45l2.068-1.93 1.364 1.46-4.432 4.14-4.432-4.14 1.364-1.46 2.068 1.93V8c0-1.1-.896-2-2-2z";
const ICON_LIKE =
  "M16.697 5.5c-1.222-.06-2.679.51-3.89 2.16l-.805 1.09-.806-1.09C10.171 6.01 8.714 5.44 7.493 5.5c-1.203.06-2.3.66-3.126 1.8-.825 1.14-1.13 2.75-.481 4.5.635 1.71 2.171 3.55 4.203 5.15 1.28 1.01 2.7 1.9 4.198 2.63 1.5-.73 2.918-1.62 4.198-2.63 2.032-1.6 3.568-3.44 4.203-5.15.649-1.75.344-3.36-.481-4.5-.825-1.14-1.923-1.74-3.126-1.8z";
const ICON_SHARE =
  "M12 2.59l5.7 5.7-1.41 1.42L13 6.41V16h-2V6.41l-3.3 3.3-1.41-1.42L12 2.59zM21 15l-.02 3.51c0 1.38-1.12 2.49-2.5 2.49H5.5C4.11 21 3 19.88 3 18.5V15h2v3.5c0 .28.22.5.5.5h12.98c.28 0 .5-.22.5-.5L19 15h2z";

// --- small pure helpers ---------------------------------------------------

function esc(s) {
  return String(s == null ? "" : s)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// Wrap @mentions, #hashtags and links in the accent color (runs on already
// escaped text, so entities like &amp; are preserved).
function linkify(escaped, accent) {
  return escaped.replace(
    /(https?:\/\/[^\s<]+|www\.[^\s<]+|[@#][A-Za-z0-9_]+)/g,
    (m) => `<span style="color:${accent}">${m}</span>`
  );
}

// 1234 -> "1,234", 2400 -> "2.4K", 1830000 -> "1.8M".
function formatCount(raw) {
  let n =
    typeof raw === "number"
      ? raw
      : parseInt(String(raw == null ? "" : raw).replace(/[,\s]/g, ""), 10);
  if (!Number.isFinite(n) || n < 0) n = 0;
  n = Math.floor(n);
  const short = (v) => v.toFixed(1).replace(/\.0$/, "");
  if (n < 1000) return n.toLocaleString("en-US");
  if (n < 1e6) {
    const v = n / 1e3;
    return (v >= 100 ? Math.round(v).toString() : short(v)) + "K";
  }
  if (n < 1e9) {
    const v = n / 1e6;
    return (v >= 100 ? Math.round(v).toString() : short(v)) + "M";
  }
  const v = n / 1e9;
  return (v >= 100 ? Math.round(v).toString() : short(v)) + "B";
}

function themeColors(theme) {
  if (theme === "dark") {
    return {
      bg: "#15202b",
      text: "#f7f9f9",
      sub: "#8b98a5",
      border: "#38444d",
      accent: "#1d9bf0",
      placeholder: "#38444d",
    };
  }
  return {
    bg: "#ffffff",
    text: "#0f1419",
    sub: "#536471",
    border: "#cfd9de",
    accent: "#1d9bf0",
    placeholder: "#c4cfd6",
  };
}

function iconSvg(path, color) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style="fill:${color};flex:0 0 auto;">` +
    `<g><path d="${path}"></path></g></svg>`
  );
}

function verifiedBadge(accent) {
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="20" height="20" style="flex:0 0 auto;">` +
    `<path fill="${accent}" d="M22.25 12c0-1.43-.88-2.67-2.19-3.34.46-1.39.2-2.9-.81-3.91s-2.52-1.27-3.91-.81c-.66-1.31-1.91-2.19-3.34-2.19s-2.67.88-3.33 2.19c-1.4-.46-2.91-.2-3.92.81s-1.26 2.52-.8 3.91c-1.31.67-2.2 1.91-2.2 3.34s.89 2.67 2.2 3.34c-.46 1.39-.21 2.9.8 3.91s2.52 1.26 3.91.81c.67 1.31 1.91 2.19 3.34 2.19s2.68-.88 3.34-2.19c1.39.45 2.9.2 3.91-.81s1.27-2.52.81-3.91c1.31-.67 2.19-1.91 2.19-3.34z"></path>` +
    `<path fill="#ffffff" d="M12 16.35l-3.86-3.86 1.42-1.42 2.32 2.32 4.79-5.02 1.45 1.38z"></path></svg>`
  );
}

// Build the whole card as an HTML string. withNs=true adds the XHTML namespace
// on the root so the markup is valid inside an SVG <foreignObject>.
function buildCard(o, withNs) {
  const c = themeColors(o.theme);
  const name = esc((o.name || "").trim()) || "Display Name";
  const rawHandle = String(o.handle || "").trim().replace(/^@+/, "").replace(/\s+/g, "");
  const handle = esc(rawHandle) || "username";
  const initial = ((o.name || "").trim().charAt(0) || "?").toUpperCase();

  const textEsc = esc(o.text || "");
  const bodyHtml = o.text
    ? linkify(textEsc, c.accent)
    : `<span style="color:${c.sub}">What's happening?</span>`;

  const avatar = o.avatar
    ? `<img src="${esc(o.avatar)}" alt="" width="48" height="48" style="width:48px;height:48px;border-radius:9999px;object-fit:cover;display:block;"></img>`
    : `<div style="width:48px;height:48px;border-radius:9999px;background:${c.placeholder};color:#ffffff;display:flex;align-items:center;justify-content:center;font-weight:700;font-size:22px;line-height:1;">${esc(initial)}</div>`;

  const badge = o.verified ? verifiedBadge(c.accent) : "";

  const dots =
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" style="fill:${c.sub};flex:0 0 auto;">` +
    `<g><circle cx="5" cy="12" r="1.9"></circle><circle cx="12" cy="12" r="1.9"></circle><circle cx="19" cy="12" r="1.9"></circle></g></svg>`;

  const stamp = o.stamp
    ? `<div style="margin-top:14px;color:${c.sub};font-size:15px;">${esc(o.stamp)}</div>`
    : "";

  const action = (path, count) =>
    `<div style="display:flex;align-items:center;gap:7px;">${iconSvg(path, c.sub)}` +
    (count == null ? "" : `<span style="color:${c.sub};font-size:13px;">${count}</span>`) +
    `</div>`;

  const rootStyle =
    `box-sizing:border-box;width:100%;background:${c.bg};color:${c.text};` +
    `border:1px solid ${c.border};border-radius:16px;padding:14px 16px;` +
    `font-family:${FONT};font-size:15px;line-height:1.3;text-align:left;`;

  const open = withNs
    ? `<div xmlns="http://www.w3.org/1999/xhtml" style="${rootStyle}">`
    : `<div style="${rootStyle}">`;

  return (
    open +
    // header
    `<div style="display:flex;align-items:flex-start;gap:12px;">` +
    `<div style="flex:0 0 auto;">${avatar}</div>` +
    `<div style="flex:1 1 auto;min-width:0;">` +
    `<div style="display:flex;align-items:center;gap:4px;min-width:0;">` +
    `<span style="font-weight:700;color:${c.text};white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">${name}</span>` +
    badge +
    `</div>` +
    `<div style="color:${c.sub};font-size:15px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;">@${handle}</div>` +
    `</div>` +
    `<div style="flex:0 0 auto;padding-left:8px;">${dots}</div>` +
    `</div>` +
    // body
    `<div style="margin-top:12px;font-size:18px;line-height:1.4;color:${c.text};white-space:pre-wrap;word-wrap:break-word;overflow-wrap:break-word;">${bodyHtml}</div>` +
    stamp +
    // divider
    `<div style="border-top:1px solid ${c.border};margin:14px 0;"></div>` +
    // actions
    `<div style="display:flex;align-items:center;justify-content:space-between;max-width:440px;">` +
    action(ICON_REPLY, formatCount(o.replies)) +
    action(ICON_REPOST, formatCount(o.reposts)) +
    action(ICON_LIKE, formatCount(o.likes)) +
    action(ICON_SHARE, null) +
    `</div>` +
    `</div>`
  );
}

export default function FakeTweetGenerator() {
  const [name, setName] = useState("Jane Doe");
  const [handle, setHandle] = useState("janedoe");
  const [text, setText] = useState(
    "Just shipped a mockup with a free browser tool — no login, no tracking, just a clean card for memes and design comps. 🎨"
  );
  const [replies, setReplies] = useState("128");
  const [reposts, setReposts] = useState("2400");
  const [likes, setLikes] = useState("18200");
  const [verified, setVerified] = useState(true);
  const [theme, setTheme] = useState("light");
  const [avatar, setAvatar] = useState("");
  const [avatarName, setAvatarName] = useState("");
  const [stamp, setStamp] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const fileRef = useRef(null);

  // Set the timestamp after mount so server and first client render match
  // (avoids hydration mismatch), then it reflects "now".
  useEffect(() => {
    const d = new Date();
    const t = d.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" });
    const day = d.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
    setStamp(`${t} · ${day}`);
  }, []);

  const state = { name, handle, text, replies, reposts, likes, verified, theme, avatar, stamp };

  const previewHtml = useMemo(
    () => buildCard(state, false),
    [name, handle, text, replies, reposts, likes, verified, theme, avatar, stamp]
  );

  // Downscale an uploaded avatar to a small square so the exported PNG stays
  // light and the SVG rasterization doesn't choke on a huge data URL.
  function processAvatar(dataUrl) {
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        try {
          const S = 240;
          const canvas = document.createElement("canvas");
          canvas.width = S;
          canvas.height = S;
          const ctx = canvas.getContext("2d");
          const ratio = Math.max(S / img.width, S / img.height);
          const w = img.width * ratio;
          const h = img.height * ratio;
          ctx.drawImage(img, (S - w) / 2, (S - h) / 2, w, h);
          resolve(canvas.toDataURL("image/jpeg", 0.92));
        } catch {
          resolve(dataUrl);
        }
      };
      img.onerror = () => resolve(dataUrl);
      img.src = dataUrl;
    });
  }

  function onAvatarPick(e) {
    const file = e.target.files && e.target.files[0];
    if (e.target) e.target.value = "";
    if (!file) return;
    setError("");
    if (!file.type.startsWith("image/")) {
      setError("Please choose an image file (PNG, JPG, WebP…) for the avatar.");
      return;
    }
    const reader = new FileReader();
    reader.onload = async () => {
      const processed = await processAvatar(String(reader.result));
      setAvatar(processed);
      setAvatarName(file.name || "avatar");
    };
    reader.onerror = () => setError("Couldn't read that image. Try another file.");
    reader.readAsDataURL(file);
  }

  function clearAvatar() {
    setAvatar("");
    setAvatarName("");
  }

  function downloadPng() {
    if (busy) return;
    setError("");
    setBusy(true);
    try {
      const W = 600;
      const scale = 2;

      // Measure the real rendered height at the export width.
      const meas = document.createElement("div");
      meas.style.cssText =
        "position:absolute;left:-10000px;top:0;width:600px;pointer-events:none;";
      meas.innerHTML = buildCard(state, false);
      document.body.appendChild(meas);
      const el = meas.firstElementChild;
      const H = Math.max(1, Math.ceil(el.getBoundingClientRect().height) + 1);
      document.body.removeChild(meas);

      const card = buildCard(state, true);
      const svg =
        `<svg xmlns="http://www.w3.org/2000/svg" width="${W * scale}" height="${H * scale}" ` +
        `viewBox="0 0 ${W} ${H}"><foreignObject x="0" y="0" width="${W}" height="${H}">` +
        card +
        `</foreignObject></svg>`;

      const svgBlob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
      const svgUrl = URL.createObjectURL(svgBlob);
      const img = new Image();

      img.onload = () => {
        try {
          const canvas = document.createElement("canvas");
          canvas.width = W * scale;
          canvas.height = H * scale;
          const ctx = canvas.getContext("2d");
          ctx.drawImage(img, 0, 0);
          URL.revokeObjectURL(svgUrl);
          canvas.toBlob((png) => {
            if (!png) {
              setError("Export failed in this browser. Try Chrome or Edge.");
              setBusy(false);
              return;
            }
            const pngUrl = URL.createObjectURL(png);
            const safe =
              String(handle || "").trim().replace(/^@+/, "").replace(/[^a-z0-9_-]/gi, "") ||
              "tweet";
            const a = document.createElement("a");
            a.href = pngUrl;
            a.download = `${safe}-mockup.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            setTimeout(() => URL.revokeObjectURL(pngUrl), 1500);
            setBusy(false);
          }, "image/png");
        } catch {
          URL.revokeObjectURL(svgUrl);
          setError(
            "Your browser blocked rasterizing the card (a known Firefox limit). Chrome or Edge will export it."
          );
          setBusy(false);
        }
      };
      img.onerror = () => {
        URL.revokeObjectURL(svgUrl);
        setError("Couldn't render the card to an image. Please try again.");
        setBusy(false);
      };
      img.src = svgUrl;
    } catch {
      setError("Something went wrong while exporting.");
      setBusy(false);
    }
  }

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-name">
              Display name
            </label>
            <input
              id="ft-name"
              className="tool-input"
              type="text"
              value={name}
              maxLength={50}
              placeholder="Jane Doe"
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-handle">
              @ handle
            </label>
            <input
              id="ft-handle"
              className="tool-input"
              type="text"
              value={handle}
              maxLength={40}
              placeholder="janedoe"
              onChange={(e) => setHandle(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-field">
          <label className="tool-label" htmlFor="ft-text">
            Post text
          </label>
          <textarea
            id="ft-text"
            className="tool-textarea"
            rows={4}
            value={text}
            maxLength={600}
            placeholder="What's happening?"
            onChange={(e) => setText(e.target.value)}
          />
          <p className="tool-note" style={{ marginTop: 4 }}>
            @mentions, #hashtags and links are highlighted automatically. {text.length}/600
          </p>
        </div>

        <div className="tool-field">
          <label className="tool-label">Avatar (optional)</label>
          <div className="tool-actions" style={{ marginTop: 0 }}>
            <button
              type="button"
              className="btn"
              onClick={() => fileRef.current && fileRef.current.click()}
            >
              {avatar ? "Change avatar" : "Upload avatar"}
            </button>
            {avatar && (
              <button type="button" className="btn" onClick={clearAvatar}>
                Remove
              </button>
            )}
            {avatar && (
              <img
                src={avatar}
                alt="Avatar preview"
                width={36}
                height={36}
                style={{
                  width: 36,
                  height: 36,
                  borderRadius: "9999px",
                  objectFit: "cover",
                  border: "1px solid rgba(128,128,128,0.4)",
                }}
              />
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            onChange={onAvatarPick}
            hidden
          />
          {avatarName && (
            <p className="tool-note" style={{ marginTop: 4 }}>
              Using: {avatarName}
            </p>
          )}
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-replies">
              Replies
            </label>
            <input
              id="ft-replies"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={replies}
              placeholder="0"
              onChange={(e) => setReplies(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-reposts">
              Reposts
            </label>
            <input
              id="ft-reposts"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={reposts}
              placeholder="0"
              onChange={(e) => setReposts(e.target.value)}
            />
          </div>
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-likes">
              Likes
            </label>
            <input
              id="ft-likes"
              className="tool-input"
              type="number"
              inputMode="numeric"
              min="0"
              step="1"
              value={likes}
              placeholder="0"
              onChange={(e) => setLikes(e.target.value)}
            />
          </div>
        </div>

        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="ft-theme">
              Theme
            </label>
            <select
              id="ft-theme"
              className="tool-select"
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
            >
              <option value="light">Light</option>
              <option value="dark">Dark</option>
            </select>
          </div>
          <div className="tool-field">
            <label
              className="tool-label"
              htmlFor="ft-verified"
              style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
            >
              <input
                id="ft-verified"
                type="checkbox"
                checked={verified}
                onChange={(e) => setVerified(e.target.checked)}
              />
              Show verified badge
            </label>
          </div>
        </div>
      </div>

      {/* Live preview */}
      <div className="tool-label" style={{ marginTop: 22, marginBottom: 8 }}>
        Preview
      </div>
      <div
        style={{
          padding: 16,
          borderRadius: 12,
          border: "1px solid rgba(128,128,128,0.3)",
          background: "rgba(128,128,128,0.06)",
        }}
      >
        <div style={{ width: "min(600px, 100%)", margin: "0 auto" }}>
          <div dangerouslySetInnerHTML={{ __html: previewHtml }} />
        </div>
      </div>

      {error && (
        <p className="tool-error" role="alert" style={{ marginTop: 12 }}>
          {error}
        </p>
      )}

      <div className="tool-actions" style={{ marginTop: 16 }}>
        <button
          type="button"
          className="btn btn-success"
          onClick={downloadPng}
          disabled={busy}
        >
          {busy ? "Rendering…" : "↓ Download PNG"}
        </button>
      </div>

      <p className="tool-note" style={{ marginTop: 12 }}>
        Parody / mockup tool for design and memes only. The card is not a real
        post and is not affiliated with, endorsed by, or connected to X (Twitter)
        or any other platform. Do not use it to impersonate anyone or spread
        misinformation.
      </p>
      <p className="tool-note">
        The PNG is drawn from the live card using an SVG foreignObject rasterized
        to a canvas — best supported in Chrome and Edge. Everything runs in your
        browser; nothing you type or upload is sent to a server.
      </p>
    </div>
  );
}
