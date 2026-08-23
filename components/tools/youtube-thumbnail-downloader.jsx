"use client";

import { useMemo, useState } from "react";

// Pull the 11-character YouTube video ID out of any common URL shape,
// or accept a bare ID. Returns the ID string, or "" if nothing matches.
function parseVideoId(raw) {
  const input = String(raw || "").trim();
  if (!input) return "";

  const idPattern = /^[A-Za-z0-9_-]{11}$/;

  // Bare 11-char ID pasted directly.
  if (idPattern.test(input)) return input;

  // Try to treat it as a URL. Prepend a protocol if the user omitted it
  // so the URL constructor can parse host/path reliably.
  let url;
  try {
    const withProtocol = /^https?:\/\//i.test(input) ? input : `https://${input}`;
    url = new URL(withProtocol);
  } catch (e) {
    url = null;
  }

  if (url) {
    const host = url.hostname.replace(/^www\./i, "").toLowerCase();
    const parts = url.pathname.split("/").filter(Boolean);

    // youtu.be/ID
    if (host === "youtu.be" && parts[0] && idPattern.test(parts[0])) {
      return parts[0];
    }

    if (
      host === "youtube.com" ||
      host === "m.youtube.com" ||
      host === "youtube-nocookie.com" ||
      host === "music.youtube.com"
    ) {
      // youtube.com/watch?v=ID
      const vParam = url.searchParams.get("v");
      if (vParam && idPattern.test(vParam)) return vParam;

      // /shorts/ID, /embed/ID, /v/ID, /live/ID
      if (
        parts.length >= 2 &&
        ["shorts", "embed", "v", "live"].includes(parts[0].toLowerCase()) &&
        idPattern.test(parts[1])
      ) {
        return parts[1];
      }
    }
  }

  // Last resort: scan the raw string for the first 11-char token that looks
  // like an ID immediately after a known marker.
  const marker = input.match(
    /(?:v=|\/shorts\/|\/embed\/|\/v\/|\/live\/|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  if (marker && marker[1]) return marker[1];

  return "";
}

const RESOLUTIONS = [
  { key: "maxresdefault", label: "Max", size: "1280 x 720" },
  { key: "sddefault", label: "Standard", size: "640 x 480" },
  { key: "hqdefault", label: "High", size: "480 x 360" },
  { key: "mqdefault", label: "Medium", size: "320 x 180" },
];

export default function YoutubeThumbnailDownloader() {
  const [value, setValue] = useState("");

  const videoId = useMemo(() => parseVideoId(value), [value]);
  const hasInput = value.trim().length > 0;
  const showError = hasInput && !videoId;

  const thumbnails = useMemo(() => {
    if (!videoId) return [];
    return RESOLUTIONS.map((r) => ({
      ...r,
      url: `https://img.youtube.com/vi/${videoId}/${r.key}.jpg`,
      fileName: `${videoId}-${r.key}.jpg`,
    }));
  }, [videoId]);

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="ytt-url">
            YouTube URL or video ID
          </label>
          <input
            className="tool-input"
            id="ytt-url"
            type="text"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            placeholder="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
            autoComplete="off"
            spellCheck={false}
          />
        </div>
      </div>

      {showError ? (
        <p className="tool-error">
          Could not find a video ID in that input. Paste a full YouTube link
          (watch, youtu.be, shorts, or embed) or an 11-character video ID.
        </p>
      ) : null}

      {videoId ? (
        <>
          <div className="tool-result" role="status" aria-live="polite">
            <p className="tool-result-label">Detected video ID</p>
            <div className="tool-result-value">{videoId}</div>
          </div>

          <div
            className="tool-stat-grid" role="status" aria-live="polite"
            style={{ marginTop: "1rem", gap: "1rem" }}
          >
            {thumbnails.map((thumb) => (
              <div
                className="tool-stat"
                key={thumb.key}
                style={{ textAlign: "left" }}
              >
                <img
                  src={thumb.url}
                  alt={`${thumb.label} resolution thumbnail for video ${videoId}`}
                  loading="lazy"
                  style={{
                    width: "100%",
                    height: "auto",
                    display: "block",
                    borderRadius: "6px",
                    marginBottom: "0.6rem",
                    background: "rgba(127,127,127,0.12)",
                  }}
                />
                <div className="tool-stat-num" style={{ fontSize: "1.1rem" }}>
                  {thumb.label}
                </div>
                <div className="tool-stat-label">{thumb.size}</div>
                <div className="tool-actions" style={{ marginTop: "0.6rem" }}>
                  <a
                    className="btn btn-primary"
                    href={thumb.url}
                    download={thumb.fileName}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    Download
                  </a>
                </div>
              </div>
            ))}
          </div>

          <p className="tool-note">
            Not every video has every size. &quot;Max&quot; (maxresdefault) only
            exists for videos uploaded in HD, so a blank or grey box means that
            resolution was never generated for this video &mdash; try a lower
            one. If a download opens the image in a new tab instead of saving,
            right-click it and choose &quot;Save image as&quot;.
          </p>
        </>
      ) : !hasInput ? (
        <p className="tool-note">
          Paste a YouTube link or video ID above to instantly grab its thumbnail
          images in every available resolution. Everything runs in your browser
          &mdash; nothing is uploaded.
        </p>
      ) : null}
    </div>
  );
}
