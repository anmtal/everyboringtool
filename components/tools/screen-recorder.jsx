"use client";

import { useState, useRef, useEffect, useCallback } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / Math.pow(1024, i);
  const rounded = value >= 100 || i === 0 ? Math.round(value) : Math.round(value * 10) / 10;
  return `${rounded} ${units[i]}`;
}

function formatClock(totalSeconds) {
  const s = Math.max(0, Math.floor(totalSeconds));
  const hh = Math.floor(s / 3600);
  const mm = Math.floor((s % 3600) / 60);
  const ss = s % 60;
  const pad = (n) => String(n).padStart(2, "0");
  return hh > 0 ? `${hh}:${pad(mm)}:${pad(ss)}` : `${pad(mm)}:${pad(ss)}`;
}

// Pick the best container/codec this browser can actually record.
function pickMimeType() {
  if (typeof MediaRecorder === "undefined") return "";
  const candidates = [
    "video/webm;codecs=vp9,opus",
    "video/webm;codecs=vp8,opus",
    "video/webm;codecs=vp9",
    "video/webm;codecs=vp8",
    "video/webm",
    "video/mp4",
  ];
  for (const type of candidates) {
    try {
      if (MediaRecorder.isTypeSupported(type)) return type;
    } catch {
      /* ignore and keep trying */
    }
  }
  return "";
}

function extForMime(mime) {
  if (!mime) return "webm";
  if (mime.indexOf("mp4") !== -1) return "mp4";
  return "webm";
}

export default function ScreenRecorder() {
  const [micEnabled, setMicEnabled] = useState(false);
  const [systemAudioEnabled, setSystemAudioEnabled] = useState(true);

  const [status, setStatus] = useState("idle"); // idle | recording | paused | done
  const [elapsed, setElapsed] = useState(0);
  const [error, setError] = useState("");
  const [supported, setSupported] = useState(true);

  const [outputUrl, setOutputUrl] = useState("");
  const [outputSize, setOutputSize] = useState(0);
  const [outputExt, setOutputExt] = useState("webm");

  const recorderRef = useRef(null);
  const chunksRef = useRef([]);
  const displayStreamRef = useRef(null);
  const micStreamRef = useRef(null);
  const outputUrlRef = useRef("");
  const timerRef = useRef(null);
  const startedAtRef = useRef(0);
  const accumulatedRef = useRef(0); // seconds counted before a pause
  const mimeRef = useRef("");

  const isRecording = status === "recording";
  const isPaused = status === "paused";
  const isActive = isRecording || isPaused;

  useEffect(() => {
    const ok =
      typeof navigator !== "undefined" &&
      navigator.mediaDevices &&
      typeof navigator.mediaDevices.getDisplayMedia === "function" &&
      typeof MediaRecorder !== "undefined";
    setSupported(!!ok);
  }, []);

  const revokeOutput = useCallback(() => {
    if (outputUrlRef.current) {
      URL.revokeObjectURL(outputUrlRef.current);
      outputUrlRef.current = "";
    }
  }, []);

  const stopTicker = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  }, []);

  const stopTracks = useCallback(() => {
    if (displayStreamRef.current) {
      displayStreamRef.current.getTracks().forEach((t) => t.stop());
      displayStreamRef.current = null;
    }
    if (micStreamRef.current) {
      micStreamRef.current.getTracks().forEach((t) => t.stop());
      micStreamRef.current = null;
    }
  }, []);

  // Cleanup on unmount.
  useEffect(() => {
    return () => {
      stopTicker();
      stopTracks();
      try {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      } catch {
        /* ignore */
      }
      revokeOutput();
    };
  }, [stopTicker, stopTracks, revokeOutput]);

  const startTicker = useCallback(() => {
    startedAtRef.current = Date.now();
    stopTicker();
    timerRef.current = setInterval(() => {
      const live = (Date.now() - startedAtRef.current) / 1000;
      setElapsed(accumulatedRef.current + live);
    }, 250);
  }, [stopTicker]);

  const startRecording = useCallback(async () => {
    setError("");
    if (!supported) {
      setError("Screen recording is not supported in this browser. Try the latest Chrome, Edge, or Firefox on a desktop.");
      return;
    }

    // Clear any previous result.
    revokeOutput();
    setOutputUrl("");
    setOutputSize(0);
    setElapsed(0);
    accumulatedRef.current = 0;
    chunksRef.current = [];

    let displayStream;
    try {
      displayStream = await navigator.mediaDevices.getDisplayMedia({
        video: { frameRate: 30 },
        audio: systemAudioEnabled,
      });
    } catch (err) {
      if (err && (err.name === "NotAllowedError" || err.name === "AbortError")) {
        setError("Screen sharing was cancelled. Nothing was recorded.");
      } else {
        setError("Could not start screen capture. Make sure your browser has permission to share the screen.");
      }
      return;
    }
    displayStreamRef.current = displayStream;

    // Optionally mix in the microphone.
    let audioTracks = displayStream.getAudioTracks();
    if (micEnabled) {
      try {
        const micStream = await navigator.mediaDevices.getUserMedia({ audio: true });
        micStreamRef.current = micStream;
        audioTracks = audioTracks.concat(micStream.getAudioTracks());
      } catch {
        // Non-fatal: keep recording without the mic.
        setError("Microphone was blocked, so the recording continues without your voice.");
      }
    }

    const tracks = displayStream.getVideoTracks().concat(audioTracks);
    const combined = new MediaStream(tracks);

    const mime = pickMimeType();
    mimeRef.current = mime;

    let recorder;
    try {
      recorder = mime ? new MediaRecorder(combined, { mimeType: mime }) : new MediaRecorder(combined);
    } catch {
      stopTracks();
      setError("This browser could not create a recorder for the captured screen.");
      return;
    }
    recorderRef.current = recorder;

    recorder.ondataavailable = (e) => {
      if (e.data && e.data.size > 0) chunksRef.current.push(e.data);
    };

    recorder.onstop = () => {
      stopTicker();
      stopTracks();
      const type = (recorderRef.current && recorderRef.current.mimeType) || mimeRef.current || "video/webm";
      const blob = new Blob(chunksRef.current, { type: type.split(";")[0] || "video/webm" });
      chunksRef.current = [];
      if (!blob.size) {
        setStatus("idle");
        setError("The recording came out empty. Please try again.");
        return;
      }
      revokeOutput();
      const url = URL.createObjectURL(blob);
      outputUrlRef.current = url;
      setOutputUrl(url);
      setOutputSize(blob.size);
      setOutputExt(extForMime(type));
      setStatus("done");
    };

    // If the user clicks the browser's native "Stop sharing" button, end cleanly.
    const videoTrack = displayStream.getVideoTracks()[0];
    if (videoTrack) {
      videoTrack.addEventListener("ended", () => {
        if (recorderRef.current && recorderRef.current.state !== "inactive") {
          recorderRef.current.stop();
        }
      });
    }

    try {
      recorder.start(1000); // gather data in 1s timeslices
    } catch {
      stopTracks();
      setError("Recording could not be started.");
      return;
    }

    accumulatedRef.current = 0;
    startTicker();
    setStatus("recording");
  }, [supported, systemAudioEnabled, micEnabled, revokeOutput, stopTracks, stopTicker, startTicker]);

  const pauseRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "recording") return;
    try {
      rec.pause();
    } catch {
      return;
    }
    // Bank the elapsed live time and stop the ticker.
    accumulatedRef.current += (Date.now() - startedAtRef.current) / 1000;
    stopTicker();
    setStatus("paused");
  }, [stopTicker]);

  const resumeRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (!rec || rec.state !== "paused") return;
    try {
      rec.resume();
    } catch {
      return;
    }
    startTicker();
    setStatus("recording");
  }, [startTicker]);

  const stopRecording = useCallback(() => {
    const rec = recorderRef.current;
    if (rec && rec.state !== "inactive") {
      try {
        rec.stop();
      } catch {
        /* onstop may still fire */
      }
    } else {
      stopTicker();
      stopTracks();
    }
  }, [stopTicker, stopTracks]);

  const resetAll = useCallback(() => {
    revokeOutput();
    setOutputUrl("");
    setOutputSize(0);
    setElapsed(0);
    accumulatedRef.current = 0;
    setStatus("idle");
    setError("");
  }, [revokeOutput]);

  const downloadName = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    const stamp = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}_${pad(
      now.getHours()
    )}-${pad(now.getMinutes())}-${pad(now.getSeconds())}`;
    return `screen-recording_${stamp}.${outputExt}`;
  };

  return (
    <div className="tool">
      <div className="tool-fields">
        <div className="tool-row">
          <div className="tool-field">
            <label className="tool-label" htmlFor="screen-recorder-sysaudio">
              System / tab audio
            </label>
            <select
              id="screen-recorder-sysaudio"
              className="tool-select"
              value={systemAudioEnabled ? "on" : "off"}
              onChange={(e) => setSystemAudioEnabled(e.target.value === "on")}
              disabled={isActive}
            >
              <option value="on">Include system audio</option>
              <option value="off">No system audio</option>
            </select>
            <p className="tool-note">
              System audio capture depends on the browser and what you share. In Chrome and Edge, tick
              &ldquo;Share tab audio&rdquo; or &ldquo;Share system audio&rdquo; in the share dialog.
            </p>
          </div>

          <div className="tool-field">
            <label className="tool-label" htmlFor="screen-recorder-mic">
              Microphone
            </label>
            <select
              id="screen-recorder-mic"
              className="tool-select"
              value={micEnabled ? "on" : "off"}
              onChange={(e) => setMicEnabled(e.target.value === "on")}
              disabled={isActive}
            >
              <option value="off">No microphone</option>
              <option value="on">Record my voice</option>
            </select>
            <p className="tool-note">Turn this on to narrate over your screen. You will be asked for mic permission.</p>
          </div>
        </div>
      </div>

      {!supported ? (
        <div className="tool-error">
          Your browser does not support screen recording. Use the latest Chrome, Edge, or Firefox on a desktop or laptop.
        </div>
      ) : null}

      {error ? <div className="tool-error">{error}</div> : null}

      {isActive ? (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-result-label">{isPaused ? "Paused" : "Recording…"}</div>
          <div className="tool-result-value" style={{ fontVariantNumeric: "tabular-nums", fontSize: "2rem" }}>
            {formatClock(elapsed)}
          </div>
        </div>
      ) : null}

      {status === "done" && outputUrl ? (
        <>
          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatClock(elapsed)}</div>
              <div className="tool-stat-label">Length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(outputSize)}</div>
              <div className="tool-stat-label">File size</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outputExt.toUpperCase()}</div>
              <div className="tool-stat-label">Format</div>
            </div>
          </div>

          <div className="tool-result">
            <div className="tool-result-label">Preview</div>
            <div className="tool-result-value">
              <video
                src={outputUrl}
                controls
                playsInline
                style={{ display: "block", width: "100%", maxWidth: "100%", borderRadius: "8px" }}
              />
            </div>
          </div>
        </>
      ) : null}

      <div className="tool-actions">
        {!isActive && status !== "done" ? (
          <button type="button" className="btn btn-primary" onClick={startRecording} disabled={!supported}>
            Start recording
          </button>
        ) : null}

        {isRecording ? (
          <button type="button" className="btn" onClick={pauseRecording}>
            Pause
          </button>
        ) : null}

        {isPaused ? (
          <button type="button" className="btn" onClick={resumeRecording}>
            Resume
          </button>
        ) : null}

        {isActive ? (
          <button type="button" className="btn btn-primary" onClick={stopRecording}>
            Stop
          </button>
        ) : null}

        {status === "done" && outputUrl ? (
          <>
            <a className="btn btn-success" href={outputUrl} download={downloadName()} role="button">
              Download video
            </a>
            <button type="button" className="btn" onClick={resetAll}>
              Record again
            </button>
          </>
        ) : null}
      </div>

      {status === "idle" && !error && supported ? (
        <p className="tool-note">
          Click &ldquo;Start recording&rdquo;, choose a screen, window, or browser tab, and everything is captured
          locally. When you stop, preview and download the video right here &mdash; nothing is ever uploaded.
        </p>
      ) : null}
    </div>
  );
}
