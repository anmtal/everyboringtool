"use client";

import { useState, useRef, useEffect, useCallback } from "react";

// Pick the best audio container/codec the browser will actually record.
function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "audio/webm;codecs=opus",
    "audio/webm",
    "audio/ogg;codecs=opus",
    "audio/ogg",
    "audio/mp4",
  ];
  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* ignore */
    }
  }
  return "";
}

// File extension for a given recorded mime type.
function extForMime(mime) {
  if (!mime) return "webm";
  if (mime.includes("mp4")) return "m4a";
  if (mime.includes("ogg")) return "ogg";
  return "webm";
}

function formatTime(ms) {
  const safe = Number.isFinite(ms) && ms > 0 ? ms : 0;
  const totalSeconds = Math.floor(safe / 1000);
  const seconds = totalSeconds % 60;
  const totalMinutes = Math.floor(totalSeconds / 60);
  const minutes = totalMinutes % 60;
  const hours = Math.floor(totalMinutes / 60);
  const pad = (n) => String(n).padStart(2, "0");
  return hours > 0
    ? `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`
    : `${pad(minutes)}:${pad(seconds)}`;
}

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

export default function VoiceRecorder() {
  const [status, setStatus] = useState("idle"); // idle | recording | paused | recorded
  const [elapsed, setElapsed] = useState(0); // ms
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const [clipUrl, setClipUrl] = useState("");
  const [clipSize, setClipSize] = useState(0);
  const [clipDuration, setClipDuration] = useState(0); // ms
  const [clipExt, setClipExt] = useState("webm");

  // Refs for objects that must not trigger re-render.
  const streamRef = useRef(null);
  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const mimeRef = useRef("");
  const clipUrlRef = useRef("");

  // Timer refs.
  const rafRef = useRef(null);
  const startRef = useRef(0);
  const baseRef = useRef(0);
  const statusRef = useRef("idle");

  // Web Audio (live level meter) refs.
  const audioCtxRef = useRef(null);
  const analyserRef = useRef(null);
  const sourceRef = useRef(null);
  const canvasRef = useRef(null);
  const meterRafRef = useRef(null);

  useEffect(() => {
    const hasGUM =
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getUserMedia === "function";
    const hasRecorder = typeof MediaRecorder !== "undefined";
    setSupported(Boolean(hasGUM && hasRecorder));
  }, []);

  const stopTimer = useCallback(() => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  }, []);

  const tick = useCallback(() => {
    if (statusRef.current !== "recording") return;
    const now = performance.now();
    setElapsed(baseRef.current + (now - startRef.current));
    rafRef.current = requestAnimationFrame(tick);
  }, []);

  const stopMeter = useCallback(() => {
    if (meterRafRef.current) {
      cancelAnimationFrame(meterRafRef.current);
      meterRafRef.current = null;
    }
  }, []);

  // Draw a live rolling waveform from the analyser.
  const drawMeter = useCallback(() => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;
    const ctx = canvas.getContext("2d");
    const w = canvas.width;
    const h = canvas.height;
    const buf = new Uint8Array(analyser.fftSize);
    analyser.getByteTimeDomainData(buf);

    ctx.clearRect(0, 0, w, h);
    ctx.lineWidth = 2;
    ctx.strokeStyle = statusRef.current === "recording" ? "#dc2626" : "#94a3b8";
    ctx.beginPath();
    const slice = w / buf.length;
    let x = 0;
    for (let i = 0; i < buf.length; i++) {
      const v = buf[i] / 128.0; // 0..2, centered at 1
      const y = (v * h) / 2;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += slice;
    }
    ctx.lineTo(w, h / 2);
    ctx.stroke();
    meterRafRef.current = requestAnimationFrame(drawMeter);
  }, []);

  const teardownAudioGraph = useCallback(() => {
    stopMeter();
    if (sourceRef.current) {
      try {
        sourceRef.current.disconnect();
      } catch {
        /* ignore */
      }
      sourceRef.current = null;
    }
    analyserRef.current = null;
    if (audioCtxRef.current) {
      try {
        audioCtxRef.current.close();
      } catch {
        /* ignore */
      }
      audioCtxRef.current = null;
    }
  }, [stopMeter]);

  const stopStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopTimer();
      teardownAudioGraph();
      stopStream();
      if (clipUrlRef.current) URL.revokeObjectURL(clipUrlRef.current);
    };
  }, [stopTimer, teardownAudioGraph, stopStream]);

  function resetClip() {
    if (clipUrlRef.current) {
      URL.revokeObjectURL(clipUrlRef.current);
      clipUrlRef.current = "";
    }
    setClipUrl("");
    setClipSize(0);
    setClipDuration(0);
  }

  const startRecording = useCallback(async () => {
    setError("");
    resetClip();
    setElapsed(0);
    baseRef.current = 0;
    chunksRef.current = [];

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
    } catch (err) {
      if (err && err.name === "NotAllowedError") {
        setError(
          "Microphone access was blocked. Allow the mic permission in your browser and try again."
        );
      } else if (err && err.name === "NotFoundError") {
        setError("No microphone was found. Plug one in and try again.");
      } else {
        setError("Couldn't access the microphone. Check your device and permissions.");
      }
      return;
    }

    streamRef.current = stream;
    const mime = pickMimeType();
    mimeRef.current = mime;

    let recorder;
    try {
      recorder = mime
        ? new MediaRecorder(stream, { mimeType: mime })
        : new MediaRecorder(stream);
    } catch {
      stopStream();
      setError("This browser can't record audio with MediaRecorder.");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };
    recorder.onstop = () => {
      const type = mimeRef.current || (chunksRef.current[0] && chunksRef.current[0].type) || "audio/webm";
      const blob = new Blob(chunksRef.current, { type });
      chunksRef.current = [];
      const finalMs = baseRef.current;
      const url = URL.createObjectURL(blob);
      clipUrlRef.current = url;
      setClipUrl(url);
      setClipSize(blob.size);
      setClipDuration(finalMs);
      setClipExt(extForMime(type));
      setStatus("recorded");
      statusRef.current = "recorded";
    };

    // Live level meter via Web Audio.
    try {
      const AudioCtx = window.AudioContext || window.webkitAudioContext;
      if (AudioCtx) {
        const ctx = new AudioCtx();
        audioCtxRef.current = ctx;
        const source = ctx.createMediaStreamSource(stream);
        sourceRef.current = source;
        const analyser = ctx.createAnalyser();
        analyser.fftSize = 1024;
        analyserRef.current = analyser;
        source.connect(analyser);
        drawMeter();
      }
    } catch {
      /* meter is optional; ignore failures */
    }

    recorder.start();
    startRef.current = performance.now();
    setStatus("recording");
    statusRef.current = "recording";
    rafRef.current = requestAnimationFrame(tick);
  }, [drawMeter, stopStream, tick]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || statusRef.current !== "recording") return;
    try {
      rec.pause();
    } catch {
      return;
    }
    baseRef.current = baseRef.current + (performance.now() - startRef.current);
    setElapsed(baseRef.current);
    stopTimer();
    setStatus("paused");
    statusRef.current = "paused";
  }, [stopTimer]);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || statusRef.current !== "paused") return;
    try {
      rec.resume();
    } catch {
      return;
    }
    startRef.current = performance.now();
    setStatus("recording");
    statusRef.current = "recording";
    rafRef.current = requestAnimationFrame(tick);
  }, [tick]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec) return;
    // Freeze the elapsed time into the running total before stopping.
    if (statusRef.current === "recording") {
      baseRef.current = baseRef.current + (performance.now() - startRef.current);
    }
    setElapsed(baseRef.current);
    stopTimer();
    teardownAudioGraph();
    try {
      if (rec.state !== "inactive") rec.stop();
    } catch {
      /* ignore */
    }
    stopStream();
  }, [stopTimer, teardownAudioGraph, stopStream]);

  const discard = useCallback(() => {
    resetClip();
    setElapsed(0);
    baseRef.current = 0;
    setStatus("idle");
    statusRef.current = "idle";
    setError("");
  }, []);

  function download() {
    if (!clipUrl) return;
    const stamp = new Date()
      .toISOString()
      .slice(0, 19)
      .replace(/[:T]/g, "-");
    const a = document.createElement("a");
    a.href = clipUrl;
    a.download = `recording-${stamp}.${clipExt}`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  }

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isRecorded = status === "recorded";
  const isIdle = status === "idle";

  if (!supported) {
    return (
      <div className="tool">
        <p className="tool-error" role="alert">
          Your browser doesn't support in-browser audio recording (MediaRecorder or
          microphone access is unavailable). Try the latest Chrome, Edge, Firefox, or Safari
          on a page served over HTTPS.
        </p>
      </div>
    );
  }

  return (
    <div className="tool">
      {/* Timer + live waveform */}
      <div className="tool-result" style={{ textAlign: "center", marginBottom: "1rem" }}>
        <div className="tool-result-label">
          {isRecording
            ? "Recording…"
            : isPaused
            ? "Paused"
            : isRecorded
            ? "Recorded"
            : "Ready"}
        </div>
        <div
          className="tool-result-value"
          style={{
            fontVariantNumeric: "tabular-nums",
            fontFeatureSettings: '"tnum"',
            fontSize: "clamp(2rem, 9vw, 3.5rem)",
            fontWeight: 700,
            letterSpacing: "0.02em",
          }}
        >
          {formatTime(isRecorded ? clipDuration : elapsed)}
        </div>
        <canvas
          ref={canvasRef}
          width={600}
          height={80}
          aria-hidden="true"
          style={{
            width: "100%",
            maxWidth: "100%",
            height: 80,
            marginTop: "0.75rem",
            borderRadius: 8,
            background: "rgba(128,128,128,0.08)",
            display: isIdle || isRecorded ? "none" : "block",
          }}
        />
      </div>

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {/* Controls */}
      <div className="tool-actions">
        {isIdle && (
          <button type="button" className="btn btn-success" onClick={startRecording}>
            ● Start recording
          </button>
        )}

        {isRecording && (
          <>
            <button type="button" className="btn" onClick={pauseRecording}>
              ❚❚ Pause
            </button>
            <button type="button" className="btn btn-primary" onClick={stopRecording}>
              ■ Stop
            </button>
          </>
        )}

        {isPaused && (
          <>
            <button type="button" className="btn btn-success" onClick={resumeRecording}>
              ● Resume
            </button>
            <button type="button" className="btn btn-primary" onClick={stopRecording}>
              ■ Stop
            </button>
          </>
        )}

        {isRecorded && (
          <>
            <button type="button" className="btn btn-success" onClick={download}>
              ↓ Download
            </button>
            <button type="button" className="btn btn-primary" onClick={startRecording}>
              ● Record again
            </button>
            <button type="button" className="btn" onClick={discard}>
              Discard
            </button>
          </>
        )}
      </div>

      {/* Playback + stats */}
      {isRecorded && clipUrl && (
        <div role="status" aria-live="polite" style={{ marginTop: "1rem" }}>
          <div className="tool-field">
            <label className="tool-label" htmlFor="vr-audio">
              Play back your recording
            </label>
            {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
            <audio
              id="vr-audio"
              src={clipUrl}
              controls
              style={{ width: "100%", marginTop: "0.25rem" }}
            />
          </div>

          <div className="tool-stat-grid" style={{ marginTop: "1rem" }}>
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ fontVariantNumeric: "tabular-nums" }}>
                {formatTime(clipDuration)}
              </div>
              <div className="tool-stat-label">Length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(clipSize)}</div>
              <div className="tool-stat-label">File size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num" style={{ textTransform: "uppercase" }}>
                {clipExt}
              </div>
              <div className="tool-stat-label">Format</div>
            </div>
          </div>
        </div>
      )}

      <p className="tool-note" style={{ marginTop: "1rem" }}>
        {isIdle
          ? "Click Start and allow microphone access. Your voice is captured with echo cancellation and noise suppression, then kept entirely in your browser."
          : "Nothing is uploaded — audio is recorded, played back, and downloaded locally on your device. No account, no server."}
      </p>
      <p className="tool-note">
        Recordings are saved in your browser's native audio format (usually WebM/Opus, or
        M4A on Safari). To convert to MP3 or WAV, use a separate audio converter after
        downloading.
      </p>
    </div>
  );
}
