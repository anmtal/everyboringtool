"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Everything runs in the browser: we open the mic with getUserMedia, feed the
// live stream into a Web Audio AnalyserNode to draw the level meter + waveform
// with requestAnimationFrame, and use MediaRecorder for the 5-second playback.
// No audio is ever uploaded — the stream, the analysis and the recording all
// stay in this tab, and the tracks + AudioContext are torn down on Stop/unmount.

const LS_KEY = "ebt-mic-test";

const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));

function pickMime() {
  const cands = ["audio/webm;codecs=opus", "audio/webm", "audio/mp4", "audio/ogg"];
  for (const t of cands) {
    try {
      if (window.MediaRecorder && MediaRecorder.isTypeSupported && MediaRecorder.isTypeSupported(t)) {
        return { mimeType: t };
      }
    } catch (e) { /* ignore */ }
  }
  return {};
}

export default function MicTest() {
  // status: idle | requesting | running | denied | error | unsupported
  const [status, setStatus] = useState("idle");
  const [errorMsg, setErrorMsg] = useState("");
  const [devices, setDevices] = useState([]);
  const [selectedDevice, setSelectedDevice] = useState("");
  const [detected, setDetected] = useState(false);
  const [sampleRate, setSampleRate] = useState(0);
  const [recording, setRecording] = useState(false);
  const [recSecs, setRecSecs] = useState(0);
  const [recordedUrl, setRecordedUrl] = useState(null);
  const [canRecord, setCanRecord] = useState(true);

  const streamRef = useRef(null);
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const dataRef = useRef(null);
  const rafRef = useRef(0);

  const meterMaskRef = useRef(null);
  const peakRef = useRef(null);
  const levelNumRef = useRef(null);
  const peakNumRef = useRef(null);
  const canvasRef = useRef(null);

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const recTimeoutRef = useRef(null);
  const recIntervalRef = useRef(null);
  const audioRef = useRef(null);

  const peakValRef = useRef(0);
  const detectedRef = useRef(false);
  const selectedDeviceRef = useRef("");
  const lastUrlRef = useRef(null);

  const setUrl = useCallback((url) => {
    if (lastUrlRef.current) {
      try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) { /* ignore */ }
    }
    lastUrlRef.current = url;
    setRecordedUrl(url);
  }, []);

  // ---- load saved device + feature-detect MediaRecorder ----
  useEffect(() => {
    try {
      const raw = localStorage.getItem(LS_KEY);
      if (raw) {
        const s = JSON.parse(raw);
        if (typeof s.deviceId === "string") {
          setSelectedDevice(s.deviceId);
          selectedDeviceRef.current = s.deviceId;
        }
      }
    } catch (e) { /* private mode — ignore */ }
    setCanRecord(typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined");
  }, []);

  const refreshDevices = useCallback(async () => {
    try {
      const list = await navigator.mediaDevices.enumerateDevices();
      const mics = list
        .filter((d) => d.kind === "audioinput" && d.deviceId)
        .map((d, i) => ({ deviceId: d.deviceId, label: d.label || `Microphone ${i + 1}` }));
      setDevices(mics);
    } catch (e) { /* ignore */ }
  }, []);

  // ---- draw loop: RMS -> meter, time-domain -> waveform ----
  const drawWave = useCallback((d, n) => {
    const c = canvasRef.current;
    if (!c) return;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    const dpr = window.devicePixelRatio || 1;
    const w = c.clientWidth || 600;
    const h = c.clientHeight || 120;
    if (c.width !== Math.round(w * dpr) || c.height !== Math.round(h * dpr)) {
      c.width = Math.round(w * dpr);
      c.height = Math.round(h * dpr);
    }
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    // centre reference line
    ctx.strokeStyle = "rgba(120,180,255,.18)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    // waveform
    ctx.strokeStyle = "rgba(120,180,255,.9)";
    ctx.lineWidth = 2;
    ctx.lineJoin = "round";
    ctx.beginPath();
    const step = w / n;
    for (let i = 0; i < n; i++) {
      const v = d[i] / 128; // 0..2, silence sits at 1
      const y = (v * h) / 2;
      const x = i * step;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }, []);

  const draw = useCallback(() => {
    const analyser = analyserRef.current;
    const d = dataRef.current;
    if (!analyser || !d) return;
    analyser.getByteTimeDomainData(d);
    const n = d.length;
    let sum = 0;
    for (let i = 0; i < n; i++) {
      const v = (d[i] - 128) / 128;
      sum += v * v;
    }
    const rms = Math.sqrt(sum / n);
    const db = rms > 0 ? 20 * Math.log10(rms) : -100;
    const pct = clamp(((db + 60) / 60) * 100, 0, 100); // -60dB..0dB -> 0..100

    if (meterMaskRef.current) meterMaskRef.current.style.width = (100 - pct) + "%";
    peakValRef.current = Math.max(pct, peakValRef.current - 0.6); // peak hold w/ slow decay
    if (peakRef.current) peakRef.current.style.left = peakValRef.current + "%";
    if (levelNumRef.current) levelNumRef.current.textContent = Math.round(pct) + "%";
    if (peakNumRef.current) peakNumRef.current.textContent = Math.round(peakValRef.current) + "%";
    if (!detectedRef.current && pct >= 8) {
      detectedRef.current = true;
      setDetected(true);
    }

    drawWave(d, n);
    rafRef.current = requestAnimationFrame(draw);
  }, [drawWave]);

  // ---- teardown everything audio-related ----
  const teardown = useCallback(() => {
    cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;
    if (recorderRef.current && recorderRef.current.state !== "inactive") {
      try { recorderRef.current.stop(); } catch (e) { /* ignore */ }
    }
    clearTimeout(recTimeoutRef.current);
    clearInterval(recIntervalRef.current);
    if (sourceRef.current) { try { sourceRef.current.disconnect(); } catch (e) {} sourceRef.current = null; }
    if (analyserRef.current) { try { analyserRef.current.disconnect(); } catch (e) {} analyserRef.current = null; }
    if (audioCtxRef.current) { try { audioCtxRef.current.close(); } catch (e) {} audioCtxRef.current = null; }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  const resetMeter = useCallback(() => {
    if (meterMaskRef.current) meterMaskRef.current.style.width = "100%";
    if (peakRef.current) peakRef.current.style.left = "0%";
    if (levelNumRef.current) levelNumRef.current.textContent = "0%";
    if (peakNumRef.current) peakNumRef.current.textContent = "0%";
    peakValRef.current = 0;
  }, []);

  // ---- (re)open a stream for a given device id ----
  const startStream = useCallback(async (deviceId) => {
    teardown();
    const base = { echoCancellation: true, noiseSuppression: true, autoGainControl: true };
    const constraints = { audio: deviceId ? { deviceId: { exact: deviceId }, ...base } : base };
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia(constraints);
    } catch (err) {
      if (deviceId && (err.name === "OverconstrainedError" || err.name === "NotFoundError")) {
        stream = await navigator.mediaDevices.getUserMedia({ audio: base }); // fall back to default mic
      } else {
        throw err;
      }
    }
    streamRef.current = stream;

    const AC = window.AudioContext || window.webkitAudioContext;
    const ctx = new AC();
    audioCtxRef.current = ctx;
    if (ctx.state === "suspended") { try { await ctx.resume(); } catch (e) { /* ignore */ } }

    const src = ctx.createMediaStreamSource(stream);
    sourceRef.current = src;
    const analyser = ctx.createAnalyser();
    analyser.fftSize = 2048;
    analyser.smoothingTimeConstant = 0.75;
    analyserRef.current = analyser;
    dataRef.current = new Uint8Array(analyser.fftSize);
    src.connect(analyser);

    setSampleRate(ctx.sampleRate || 0);
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(draw);
  }, [teardown, draw]);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setStatus("unsupported");
      return;
    }
    setErrorMsg("");
    setStatus("requesting");
    setDetected(false);
    detectedRef.current = false;
    resetMeter();
    try {
      await startStream(selectedDeviceRef.current || "");
      setStatus("running");
      await refreshDevices();
    } catch (err) {
      teardown();
      if (err && (err.name === "NotAllowedError" || err.name === "SecurityError" || err.name === "PermissionDeniedError")) {
        setStatus("denied");
      } else if (err && err.name === "NotFoundError") {
        setStatus("error");
        setErrorMsg("No microphone was found. Plug one in (or check your system sound settings) and try again.");
      } else {
        setStatus("error");
        setErrorMsg((err && err.message) ? err.message : "Something went wrong opening the microphone.");
      }
    }
  }, [startStream, refreshDevices, teardown, resetMeter]);

  const stop = useCallback(() => {
    teardown();
    setStatus("idle");
    setRecording(false);
    setRecSecs(0);
    setDetected(false);
    detectedRef.current = false;
    resetMeter();
  }, [teardown, resetMeter]);

  const onSelectDevice = useCallback((e) => {
    const id = e.target.value;
    setSelectedDevice(id);
    selectedDeviceRef.current = id;
    try { localStorage.setItem(LS_KEY, JSON.stringify({ deviceId: id })); } catch (err) { /* ignore */ }
    if (streamRef.current) {
      // switch live: reopen the graph on the newly chosen mic
      setDetected(false);
      detectedRef.current = false;
      resetMeter();
      startStream(id).catch(() => {
        setStatus("error");
        setErrorMsg("Could not switch to that microphone. It may be in use by another app.");
      });
    }
  }, [startStream, resetMeter]);

  // ---- record 5s and play it back ----
  const record = useCallback(() => {
    if (!streamRef.current || !canRecord || recording) return;
    chunksRef.current = [];
    let mr;
    try {
      mr = new MediaRecorder(streamRef.current, pickMime());
    } catch (e) {
      try { mr = new MediaRecorder(streamRef.current); } catch (e2) {
        setErrorMsg("Recording is not supported in this browser, but the live meter still works.");
        return;
      }
    }
    recorderRef.current = mr;
    mr.ondataavailable = (e) => { if (e.data && e.data.size > 0) chunksRef.current.push(e.data); };
    mr.onstop = () => {
      clearInterval(recIntervalRef.current);
      clearTimeout(recTimeoutRef.current);
      setRecording(false);
      setRecSecs(0);
      if (chunksRef.current.length) {
        const blob = new Blob(chunksRef.current, { type: mr.mimeType || "audio/webm" });
        setUrl(URL.createObjectURL(blob));
      }
    };
    try {
      mr.start();
    } catch (e) {
      setErrorMsg("Recording could not start on this microphone.");
      return;
    }
    setRecording(true);
    setRecSecs(5);
    recIntervalRef.current = setInterval(() => {
      setRecSecs((s) => (s > 1 ? s - 1 : 0));
    }, 1000);
    recTimeoutRef.current = setTimeout(() => {
      if (recorderRef.current && recorderRef.current.state !== "inactive") {
        try { recorderRef.current.stop(); } catch (e) { /* ignore */ }
      }
    }, 5000);
  }, [canRecord, recording, setUrl]);

  // auto-play the clip once it's ready so users immediately hear themselves
  useEffect(() => {
    if (recordedUrl && audioRef.current) {
      try { audioRef.current.play().catch(() => {}); } catch (e) { /* ignore */ }
    }
  }, [recordedUrl]);

  // keep the device list fresh when mics are plugged in/out
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
    if (lastUrlRef.current) {
      try { URL.revokeObjectURL(lastUrlRef.current); } catch (e) { /* ignore */ }
    }
  }, [teardown]);

  const running = status === "running";
  const statusText = (() => {
    if (status === "requesting") return "Waiting for microphone permission — choose Allow in your browser.";
    if (status === "running" && detected) return "Mic is working — level detected.";
    if (status === "running") return "Listening… say something or tap your mic to see the level move.";
    return "Click Start to test your microphone. You grant permission once, then watch your voice register live.";
  })();

  return (
    <div className="tool mt">
      <style>{`
        .mt .mt-status{display:flex;align-items:center;gap:9px;margin:14px 0 4px;padding:11px 13px;
          border:1px solid var(--line,#e6e6e6);border-radius:10px;font-size:14px;font-weight:500;background:var(--card,#fff);}
        .mt .mt-status.is-live{border-color:#1f8f5f;background:rgba(56,211,159,.10);color:#0f6b45;}
        .mt .mt-dot{width:10px;height:10px;border-radius:50%;background:#9aa3b2;flex:0 0 auto;}
        .mt .mt-status.is-live .mt-dot{background:#1f8f5f;animation:mtpulse 1.3s ease-in-out infinite;}
        @keyframes mtpulse{0%,100%{opacity:.4;transform:scale(.85)}50%{opacity:1;transform:scale(1.1)}}
        @media (prefers-reduced-motion: reduce){.mt .mt-status.is-live .mt-dot{animation:none;}}

        .mt .mt-scope{background:#0b0d12;border:1px solid #232838;border-radius:12px;padding:16px;margin-top:14px;}
        .mt .mt-scope-head{display:flex;justify-content:space-between;align-items:center;gap:10px;
          color:#aeb6c6;font-size:12px;font-weight:600;letter-spacing:.3px;text-transform:uppercase;margin-bottom:9px;}
        .mt .mt-meter-track{position:relative;height:22px;border-radius:6px;overflow:hidden;border:1px solid #232838;
          background:linear-gradient(90deg,#38d39f 0%,#38d39f 55%,#f6c945 80%,#ef5b5b 100%);}
        .mt .mt-meter-mask{position:absolute;top:0;right:0;height:100%;width:100%;background:#0b0d12;transition:width .05s linear;}
        .mt .mt-meter-peak{position:absolute;top:-2px;bottom:-2px;left:0;width:2px;background:#fff;box-shadow:0 0 6px rgba(255,255,255,.75);}
        .mt .mt-scale{display:flex;justify-content:space-between;color:#5c6577;font-size:10.5px;margin-top:5px;}
        .mt .mt-wave{display:block;width:100%;height:120px;margin-top:14px;background:#0b0d12;
          border:1px solid #232838;border-radius:10px;}

        .mt .mt-play{margin-top:14px;}
        .mt .mt-play audio{width:100%;margin-top:6px;}
        .mt .mt-retry{margin-top:12px;}
        .mt .mt-actions{display:flex;gap:10px;flex-wrap:wrap;align-items:center;}
      `}</style>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="mt-device">Microphone</label>
          <select
            id="mt-device"
            className="tool-select"
            value={selectedDevice}
            onChange={onSelectDevice}
          >
            {devices.length === 0 && <option value="">Default microphone</option>}
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>{d.label}</option>
            ))}
          </select>
          {devices.length === 0 && (
            <p className="tool-note" style={{ marginTop: 6 }}>
              Your microphone names appear here after you press Start and allow access.
            </p>
          )}
        </div>

        <div className="tool-actions mt-actions">
          {running ? (
            <button type="button" className="btn btn-primary" onClick={stop}>Stop</button>
          ) : (
            <button
              type="button"
              className="btn btn-primary"
              onClick={start}
              disabled={status === "requesting"}
            >
              {status === "requesting" ? "Requesting…" : "Start microphone test"}
            </button>
          )}
          <button
            type="button"
            className={recording ? "btn btn-success" : "btn"}
            onClick={record}
            disabled={!running || recording || !canRecord}
          >
            {recording ? `Recording… ${recSecs}s` : "Record 5s & play back"}
          </button>
        </div>
      </div>

      {status === "denied" && (
        <div className="mt-status" role="alert">
          <span className="mt-dot" />
          <div>
            <strong>Microphone access was blocked.</strong> Click the camera/mic icon in your browser's
            address bar (or your site settings) and set the microphone to Allow, then retry.
            <div className="mt-retry">
              <button type="button" className="btn btn-primary" onClick={start}>Retry</button>
            </div>
          </div>
        </div>
      )}

      {status === "error" && (
        <div className="mt-status" role="alert">
          <span className="mt-dot" />
          <div>
            <strong>Couldn't start the mic test.</strong> {errorMsg}
            <div className="mt-retry">
              <button type="button" className="btn btn-primary" onClick={start}>Retry</button>
            </div>
          </div>
        </div>
      )}

      {status === "unsupported" && (
        <div className="mt-status" role="alert">
          <span className="mt-dot" />
          <div>
            This browser doesn't support microphone access (getUserMedia). Try the latest Chrome, Edge,
            Firefox or Safari over an <strong>https://</strong> connection.
          </div>
        </div>
      )}

      {(status === "idle" || status === "requesting" || running) && (
        <div className={"mt-status" + (running && detected ? " is-live" : "")} role="status" aria-live="polite">
          <span className="mt-dot" />
          <span>{statusText}</span>
        </div>
      )}

      <div className="mt-scope">
        <div className="mt-scope-head">
          <span>Input level</span>
          <span>Waveform</span>
        </div>
        <div className="mt-meter-track" aria-hidden="true">
          <div className="mt-meter-mask" ref={meterMaskRef} style={{ width: "100%" }} />
          <div className="mt-meter-peak" ref={peakRef} style={{ left: "0%" }} />
        </div>
        <div className="mt-scale" aria-hidden="true">
          <span>quiet</span><span>good</span><span>loud</span>
        </div>
        <canvas className="mt-wave" ref={canvasRef} aria-hidden="true" />
      </div>

      <div className="tool-stat-grid" role="status" aria-live="off" style={{ marginTop: 14 }}>
        <div className="tool-stat">
          <div className="tool-stat-num" ref={levelNumRef}>0%</div>
          <div className="tool-stat-label">Live level</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num" ref={peakNumRef}>0%</div>
          <div className="tool-stat-label">Peak</div>
        </div>
        <div className="tool-stat">
          <div className="tool-stat-num">{sampleRate ? (sampleRate / 1000).toFixed(1) + " kHz" : "—"}</div>
          <div className="tool-stat-label">Sample rate</div>
        </div>
      </div>

      {recordedUrl && (
        <div className="mt-play">
          <label className="tool-label" htmlFor="mt-audio">Your recording</label>
          <audio id="mt-audio" ref={audioRef} src={recordedUrl} controls />
        </div>
      )}

      <p className="tool-note" style={{ marginTop: 14 }}>
        100% private: your microphone stream, the level meter and any recording stay inside this browser
        tab and are never uploaded or saved to a server. Press Stop (or close the tab) to release the mic.
      </p>
    </div>
  );
}
