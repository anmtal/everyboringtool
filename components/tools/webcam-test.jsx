"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Everything runs in the browser: we open the camera with getUserMedia({video}),
// pipe the live MediaStream straight into a <video> element, and read the real
// resolution / frame rate / aspect ratio off the track with getSettings(). The
// snapshot is drawn from that same <video> onto a <canvas> and exported as a PNG
// entirely on-device. No frame is ever uploaded — the stream, the preview and any
// snapshot stay in this tab, and every track is stopped on Stop / unmount.

const LS_KEY = "ebt-webcam-test";

function gcd(a, b) {
  a = Math.abs(a); b = Math.abs(b);
  while (b) { [a, b] = [b, a % b]; }
  return a || 1;
}

function ratioLabel(w, h) {
  if (!w || !h) return "—";
  const g = gcd(w, h);
  const rw = w / g, rh = h / g;
  if (rw <= 40 && rh <= 40) return `${rw}:${rh}`;
  return (w / h).toFixed(2) + ":1";
}

export default function WebcamTest() {
  // status: idle | requesting | running | denied | error | unsupported
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [mirror, setMirror] = useState(true);
  const [playing, setPlaying] = useState(false);
  const [settings, setSettings] = useState({ width: 0, height: 0, frameRate: 0, aspectRatio: 0 });
  const [snapshotUrl, setSnapshotUrl] = useState(null);

  const streamRef = useRef(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);

  const selectedDeviceRef = useRef("");
  const mirrorRef = useRef(true);
  const lastSnapRef = useRef(null);
  const settingsTimerRef = useRef(null);

  useEffect(() => { mirrorRef.current = mirror; }, [mirror]);

  const setSnap = useCallback((url) => {
    if (lastSnapRef.current) {
      try { URL.revokeObjectURL(lastSnapRef.current); } catch (e) { /* ignore */ }
    }
    lastSnapRef.current = url;
    setSnapshotUrl(url);
  }, []);

  // ---- load saved device + mirror preference ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.deviceId === "string") {
          setSelectedDevice(s.deviceId);
          selectedDeviceRef.current = s.deviceId;
        }
        if (typeof s.mirror === "boolean") setMirror(s.mirror);
      }
    } catch (e) { /* private mode — ignore */ }
  }, []);

  const persist = useCallback((patch) => {
    try {
      const cur = { deviceId: selectedDeviceRef.current, mirror: mirrorRef.current };
      localStorage.setItem(LS_KEY, JSON.stringify({ ...cur, ...patch }));
    } catch (e) { /* ignore */ }
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const cams = list
        .filter((d) => d.kind === "videoinput" && d.deviceId)
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Camera ${i + 1}` }));
      setDevices(cams);
    } catch (e) { /* ignore */ }
  }, []);

  // ---- read the real track settings (resolution / fps / aspect) ----
  const readSettings = useCallback(() => {
    const stream = streamRef.current;
    if (!stream) return;
    const track = stream.getVideoTracks()[0];
    if (!track || !track.getSettings) return;
    const s = track.getSettings() || {};
    const v = videoRef.current;
    const width = s.width || (v ? v.videoWidth : 0) || 0;
    const height = s.height || (v ? v.videoHeight : 0) || 0;
    setSettings({
      width,
      height,
      frameRate: s.frameRate || 0,
      aspectRatio: s.aspectRatio || (width && height ? width / height : 0),
    });
  }, []);

  // ---- stop and release everything ----
  const teardown = useCallback(() => {
    clearTimeout(settingsTimerRef.current);
    if (videoRef.current) {
      try { videoRef.current.pause(); } catch (e) { /* ignore */ }
      try { videoRef.current.srcObject = null; } catch (e) { /* ignore */ }
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => { try { t.stop(); } catch (e) {} });
      streamRef.current = null;
    }
  }, []);

  // ---- (re)open a stream for a given device id ----
  const startStream = useCallback(async (deviceId) => {
    teardown();
    const base = { width: { ideal: 1280 }, height: { ideal: 720 } };
    const constraints = { video: deviceId ? { deviceId: { exact: deviceId }, ...base } : base, audio: false };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (deviceId && (err.name === "OverconstrainedError" || err.name === "NotFoundError")) {
        stream = await navigator.mediaDevices.getUserMedia({ video: base, audio: false }); // fall back to default camera
      } else {
        throw err;
      }
    }
    streamRef.current = stream;

    const v = videoRef.current;
    if (v) {
      v.srcObject = stream;
      try { await v.play(); } catch (e) { /* autoplay may need muted; video is muted */ }
    }
    readSettings();
    // some browsers populate width/height a beat after the stream opens
    clearTimeout(settingsTimerRef.current);
    settingsTimerRef.current = setTimeout(readSettings, 500);
  }, [teardown, readSettings]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setErrorMsg("");
    setStatus("requesting");
    setPlaying(false);
    try {
      await startStream(selectedDeviceRef.current || "");
      setStatus("running");
      await refreshDevices();
    } catch (err) {
      teardown();
      if (err && (err.name === "NotAllowedError" || err.name === "SecurityError" || err.name === "PermissionDeniedError")) {
        setStatus("denied");
      } else if (err && (err.name === "NotFoundError" || err.name === "DevicesNotFoundError")) {
        setStatus("error");
        setErrorMsg("No camera was found. Plug one in (or check your system camera settings) and try again.");
      } else if (err && (err.name === "NotReadableError" || err.name === "TrackStartError")) {
        setStatus("error");
        setErrorMsg("Your camera is busy — another app (Zoom, Teams, another tab) may be using it. Close it and retry.");
      } else {
        setStatus("error");
        setErrorMsg((err && err.message) ? err.message : "Something went wrong opening the camera.");
      }
    }
  }, [startStream, refreshDevices, teardown]);

  const stop = useCallback(() => {
    teardown();
    setStatus("idle");
    setPlaying(false);
    setSettings({ width: 0, height: 0, frameRate: 0, aspectRatio: 0 });
  }, [teardown]);

  const onSelectDevice = useCallback((e) => {
    const id = e.target.value;
    setSelectedDevice(id);
    selectedDeviceRef.current = id;
    persist({ deviceId: id });
    if (streamRef.current) {
      // switch live to the newly chosen camera
      setPlaying(false);
      startStream(id).catch(() => {
        setStatus("error");
        setErrorMsg("Could not switch to that camera. It may be in use by another app.");
      });
    }
  }, [startStream, persist]);

  const toggleMirror = useCallback(() => {
    setMirror((m) => {
      const next = !m;
      mirrorRef.current = next;
      persist({ mirror: next });
      return next;
    });
  }, [persist]);

  // ---- take a PNG snapshot of the current frame ----
  const takeSnapshot = useCallback(() => {
    const v = videoRef.current;
    const c = canvasRef.current;
    if (!v || !c || status !== "running") return;
    const w = v.videoWidth || settings.width || 1280;
    const h = v.videoHeight || settings.height || 720;
    if (!w || !h) return;
    c.width = w;
    c.height = h;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    if (mirrorRef.current) { ctx.translate(w, 0); ctx.scale(-1, 1); } // match the mirrored preview
    ctx.drawImage(v, 0, 0, w, h);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    if (c.toBlob) {
      c.toBlob((blob) => { if (blob) setSnap(URL.createObjectURL(blob)); }, "image/png");
    } else {
      try { setSnap(c.toDataURL("image/png")); } catch (e) { /* ignore */ }
    }
  }, [status, settings.width, settings.height, setSnap]);

  const downloadSnapshot = useCallback(() => {
    if (!snapshotUrl) return;
    const a = document.createElement("a");
    const stamp = new Date().toISOString().slice(0, 19).replace(/[:T]/g, "-");
    a.href = snapshotUrl;
    a.download = `webcam-snapshot-${stamp}.png`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }, [snapshotUrl]);

  const clearSnapshot = useCallback(() => setSnap(null), [setSnap]);

  // keep the device list fresh as cameras are plugged in/out
  useEffect(() => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.addEventListener) return;
    const h = () => { refreshDevices(); };
    navigator.mediaDevices.addEventListener("devicechange", h);
    return () => {
      try { navigator.mediaDevices.removeEventListener("devicechange", h); } catch (e) { /* ignore */ }
    };
  }, [refreshDevices]);

  // full cleanup on unmount
  useEffect(() => () => {
    teardown();
    if (lastSnapRef.current) {
      try { URL.revokeObjectURL(lastSnapRef.current); } catch (e) { /* ignore */ }
    }
  }, [teardown]);

  const running = status === "running";
  const statusText = (() => {
    if (status === "requesting") return "Waiting for camera permission — choose Allow in your browser.";
    if (status === "running" && playing) return "Your camera is working — you should see yourself below.";
    if (status === "running") return "Camera starting… you should see a live picture in a moment.";
    return "Click Start to test your webcam. You grant permission once, then see a live preview.";
  })();

  const fps = settings.frameRate ? Math.round(settings.frameRate) : 0;

  return (
    <div className="tool wc">
      <style>{`
        .wc .wc-status{display:flex;align-items:center;gap:9px;margin:14px 0 4px;padding:11px 13px;
          border:1px solid var(--line,#e6e6e6);border-radius:10px;font-size:14px;font-weight:500;background:var(--card,#fff);}
        .wc .wc-status.is-live{border-color:#1f8f5f;background:rgba(56,211,159,.10);color:#0f6b45;}
        .wc .wc-dot{width:10px;height:10px;border-radius:50%;background:#9aa3b2;flex:0 0 auto;}
        .wc .wc-status.is-live .wc-dot{background:#1f8f5f;animation:wcpulse 1.3s ease-in-out infinite;}
        @keyframes wcpulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
        @media (prefers-reduced-motion: reduce){.wc .wc-status.is-live .wc-dot{animation:none;}}

        .wc .wc-stage{position:relative;background:#0b0d12;border:1px solid #232838;border-radius:12px;
          overflow:hidden;margin-top:14px;aspect-ratio:16/9;display:flex;align-items:center;justify-content:center;}
        .wc .wc-video{width:100%;height:100%;object-fit:contain;display:block;background:#0b0d12;}
        .wc .wc-video.is-mirror{transform:scaleX(-1);}
        .wc .wc-placeholder{position:absolute;inset:0;display:flex;flex-direction:column;gap:10px;
          align-items:center;justify-content:center;color:#8b93a6;text-align:center;padding:20px;pointer-events:none;}
        .wc .wc-cam-ico{width:52px;height:52px;opacity:.7;}
        .wc .wc-badges{position:absolute;left:10px;bottom:10px;display:flex;gap:6px;flex-wrap:wrap;z-index:2;}
        .wc .wc-badge{background:rgba(11,13,18,.72);color:#dbe2f0;border:1px solid #2c344a;border-radius:999px;
          font-size:11.5px;font-weight:600;padding:3px 9px;backdrop-filter:blur(3px);}

        .wc .wc-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
        .wc .wc-retry{margin-top:12px;}

        .wc .wc-snap{margin-top:16px;border:1px solid var(--line,#e6e6e6);border-radius:12px;
          padding:14px;background:var(--card,#fff);}
        .wc .wc-snap-head{display:flex;justify-content:space-between;align-items:center;gap:10px;margin-bottom:10px;}
        .wc .wc-snap-title{font-size:14px;font-weight:600;}
        .wc .wc-snap-img{width:100%;max-height:340px;object-fit:contain;display:block;border-radius:8px;
          background:#0b0d12;border:1px solid #232838;}
      `}</style>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="wc-device">Camera</label>
          <select
            id="wc-device"
            className="tool-select"
            value={selectedDevice}
            onChange={onSelectDevice}
          >
            {devices.length === 0 && <option value="">Default camera</option>}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
          {devices.length === 0 && (
            <p className="tool-note" style={{ marginTop: 6 }}>
              Your camera names appear here after you press Start and allow access.
            </p>
          )}
        </div>

        <div className="tool-actions wc-actions">
          {running ? (
            <button type="button" className="btn btn-primary" onClick={stop}>Stop camera</button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={start}
              disabled={status === "requesting"}
            >
              {status === "requesting" ? "Requesting…" : "Start webcam test"}
            </button>
          )}
          <button
            type="button"
            className="btn"
            onClick={takeSnapshot}
            disabled={!running}
          >
            Take snapshot
          </button>
          <button
            type="button"
            className="btn"
            onClick={toggleMirror}
          >
            {mirror ? "Mirror: on" : "Mirror: off"}
          </button>
        </div>
      </div>

      {status === "denied" && (
        <div className="wc-status" role="alert">
          <span className="wc-dot" />
          <div>
            <strong>Camera access was blocked.</strong> Click the camera icon in your browser's
            address bar (or open your site settings) and set the camera to Allow, then retry.
            <div className="wc-retry">
              <button type="button" className="btn btn-primary" onClick={start}>Retry</button>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="wc-status" role="alert">
          <span className="wc-dot" />
          <div>
            <strong>Couldn't start the webcam test.</strong> {errorMsg}
            <div className="wc-retry">
              <button type="button" className="btn btn-primary" onClick={start}>Retry</button>
            </div>
          </div>
        </div>
      )}

      {status === "unsupported" && (
        <div className="wc-status" role="alert">
          <span className="wc-dot" />
          <div>
            This browser doesn't support camera access (getUserMedia). Try the latest Chrome, Edge,
            Firefox or Safari over an <strong>https://</strong> connection.
          </div>
        </div>
      )}

      {(status === "idle" || status === "requesting" || running) && (
        <div className={"wc-status" + (running && playing ? " is-live" : "")} role="status" aria-live="polite">
          <span className="wc-dot" />
          <span>{statusText}</span>
        </div>
      )}

      <div className="wc-stage">
        <video
          ref={videoRef}
          className={"wc-video" + (mirror ? " is-mirror" : "")}
          playsInline
          muted
          autoPlay
          aria-label="Live webcam preview"
          onPlaying={() => { setPlaying(true); readSettings(); }}
          onLoadedMetadata={readSettings}
        />
        {!running && (
          <div className="wc-placeholder">
            <svg className="wc-cam-ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true">
              <rect x="2" y="6" width="14" height="12" rx="2" />
              <path d="M16 10l6-3v10l-6-3z" />
            </svg>
            <span>Your live camera preview will appear here.</span>
          </div>
        )}
        {running && (settings.width > 0) && (
          <div className="wc-badges" aria-hidden="true">
            <span className="wc-badge">{settings.width}×{settings.height}</span>
            {fps > 0 && <span className="wc-badge">{fps} fps</span>}
            <span className="wc-badge">{ratioLabel(settings.width, settings.height)}</span>
          </div>
        )}
      </div>

      <div className="tool-stat-grid" role="status" aria-live="polite" style={{ marginTop: 14 }}>
        <div className="tool-stat">
          <div className="tool-stat-num">{settings.width ? `${settings.width}×${settings.height}` : "—"}</div>
          <div className="tool-stat-label">Resolution</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{fps > 0 ? `${fps} fps` : "—"}</div>
          <div className="tool-stat-label">Frame rate</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{settings.width ? ratioLabel(settings.width, settings.height) : "—"}</div>
          <div className="tool-stat-label">Aspect ratio</div>
        </div>
      </div>

      {snapshotUrl && (
        <div className="wc-snap">
          <div className="wc-snap-head">
            <span className="wc-snap-title">Snapshot</span>
            <div className="tool-actions" style={{ margin: 0 }}>
              <button type="button" className="btn btn-primary" onClick={downloadSnapshot}>Download PNG</button>
              <button type="button" className="btn" onClick={clearSnapshot}>Clear</button>
            </div>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="wc-snap-img" src={snapshotUrl} alt="Snapshot captured from your webcam" />
        </div>
      )}

      <canvas ref={canvasRef} style={{ display: "none" }} aria-hidden="true" />

      <p className="tool-note" style={{ marginTop: 14 }}>
        100% private: your camera feed, the live preview and any snapshot stay inside this browser
        tab and are never uploaded or saved to a server. Press Stop (or close the tab) to turn the
        camera off — the light next to your webcam goes out when it is released.
      </p>
    </div>
  );
}
