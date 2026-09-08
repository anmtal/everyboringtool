"use client";

import { useState, useEffect, useRef } from "react";

function formatBytes(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return "—";
  if (bytes < 1024) return `${bytes} B`;
  const kb = bytes / 1024;
  if (kb < 1024) return `${kb.toFixed(kb < 10 ? 1 : 0)} KB`;
  const mb = kb / 1024;
  return `${mb.toFixed(mb < 10 ? 2 : 1)} MB`;
}

// Seconds -> mm:ss.mmm
function formatTime(sec) {
  if (!Number.isFinite(sec) || sec < 0) sec = 0;
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  const ms = Math.round((sec - Math.floor(sec)) * 1000);
  return `${m}:${String(s).padStart(2, "0")}.${String(ms).padStart(3, "0")}`;
}

function clamp(v, lo, hi) {
  return Math.min(Math.max(v, lo), hi);
}

// Encode an AudioBuffer (or a sliced region of it) to a 16-bit PCM WAV Blob.
function encodeWav(buffer, startSample, endSample, fade) {
  const numChannels = buffer.numberOfChannels;
  const sampleRate = buffer.sampleRate;
  const frameCount = endSample - startSample;
  const fadeSamples = fade
    ? Math.min(Math.floor(sampleRate * 0.008), Math.floor(frameCount / 2))
    : 0;

  // Pull channel data and apply optional short fades to avoid clicks.
  const channels = [];
  for (let ch = 0; ch < numChannels; ch++) {
    const src = buffer.getChannelData(ch);
    const out = new Float32Array(frameCount);
    for (let i = 0; i < frameCount; i++) {
      let v = src[startSample + i];
      if (fadeSamples > 0) {
        if (i < fadeSamples) v *= i / fadeSamples;
        else if (i >= frameCount - fadeSamples) v *= (frameCount - i) / fadeSamples;
      }
      out[i] = v;
    }
    channels.push(out);
  }

  const bytesPerSample = 2;
  const blockAlign = numChannels * bytesPerSample;
  const dataSize = frameCount * blockAlign;
  const bufferArr = new ArrayBuffer(44 + dataSize);
  const view = new DataView(bufferArr);

  const writeString = (offset, str) => {
    for (let i = 0; i < str.length; i++) view.setUint8(offset + i, str.charCodeAt(i));
  };

  writeString(0, "RIFF");
  view.setUint32(4, 36 + dataSize, true);
  writeString(8, "WAVE");
  writeString(12, "fmt ");
  view.setUint32(16, 16, true); // fmt chunk size
  view.setUint16(20, 1, true); // PCM
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bytesPerSample * 8, true);
  writeString(36, "data");
  view.setUint32(40, dataSize, true);

  // Interleave channels as 16-bit signed samples.
  let offset = 44;
  for (let i = 0; i < frameCount; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      let s = clamp(channels[ch][i], -1, 1);
      s = s < 0 ? s * 0x8000 : s * 0x7fff;
      view.setInt16(offset, s, true);
      offset += 2;
    }
  }

  return new Blob([view], { type: "audio/wav" });
}

export default function AudioTrimmer() {
  const [fileName, setFileName] = useState("");
  const [previewUrl, setPreviewUrl] = useState("");
  const [origSize, setOrigSize] = useState(0);
  const [duration, setDuration] = useState(0); // seconds
  const [start, setStart] = useState(0);
  const [end, setEnd] = useState(0);
  const [fade, setFade] = useState(true);

  const [outUrl, setOutUrl] = useState("");
  const [outSize, setOutSize] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const bufferRef = useRef(null); // decoded AudioBuffer
  const previewUrlRef = useRef("");
  const outUrlRef = useRef("");
  const audioRef = useRef(null);

  useEffect(() => {
    return () => {
      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
    };
  }, []);

  function resetOutput() {
    if (outUrlRef.current) {
      URL.revokeObjectURL(outUrlRef.current);
      outUrlRef.current = "";
    }
    setOutUrl("");
    setOutSize(0);
  }

  async function onFile(e) {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setError("");
    resetOutput();

    if (!file.type.startsWith("audio/") && !/\.(mp3|wav|ogg|m4a|aac|flac|webm)$/i.test(file.name)) {
      setError("Please choose an audio file (MP3, WAV, OGG, M4A, etc.).");
      return;
    }

    setLoading(true);
    try {
      const arrayBuf = await file.arrayBuffer();
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) {
        setLoading(false);
        setError("Your browser doesn't support the Web Audio API needed to trim audio.");
        return;
      }
      const ctx = new AC();
      // decodeAudioData needs a copy since the buffer may be detached.
      const decoded = await ctx.decodeAudioData(arrayBuf.slice(0));
      ctx.close();
      bufferRef.current = decoded;

      if (previewUrlRef.current) URL.revokeObjectURL(previewUrlRef.current);
      const url = URL.createObjectURL(file);
      previewUrlRef.current = url;

      setPreviewUrl(url);
      setFileName(file.name || "audio");
      setOrigSize(file.size);
      setDuration(decoded.duration);
      setStart(0);
      setEnd(decoded.duration);
      setLoading(false);
    } catch {
      setLoading(false);
      setError("Couldn't decode that audio file — it may be corrupted or an unsupported codec.");
    }
    e.target.value = "";
  }

  function onStartChange(v) {
    const nv = clamp(parseFloat(v) || 0, 0, duration);
    setStart(Math.min(nv, end));
    resetOutput();
  }
  function onEndChange(v) {
    const nv = clamp(parseFloat(v) || 0, 0, duration);
    setEnd(Math.max(nv, start));
    resetOutput();
  }

  function previewSelection() {
    const a = audioRef.current;
    if (!a || !previewUrl) return;
    a.currentTime = start;
    a.play();
    const stopAt = () => {
      if (a.currentTime >= end) {
        a.pause();
        a.removeEventListener("timeupdate", stopAt);
      }
    };
    a.addEventListener("timeupdate", stopAt);
  }

  function trimAndDownload() {
    const buf = bufferRef.current;
    if (!buf) {
      setError("Upload an audio file first.");
      return;
    }
    const selDur = end - start;
    if (selDur <= 0.001) {
      setError("The selection is empty — set an end time later than the start time.");
      return;
    }
    setError("");
    setBusy(true);
    try {
      const startSample = Math.floor(start * buf.sampleRate);
      const endSample = Math.min(Math.floor(end * buf.sampleRate), buf.length);
      const blob = encodeWav(buf, startSample, endSample, fade);
      if (outUrlRef.current) URL.revokeObjectURL(outUrlRef.current);
      const url = URL.createObjectURL(blob);
      outUrlRef.current = url;
      setOutUrl(url);
      setOutSize(blob.size);
      setBusy(false);
    } catch {
      setBusy(false);
      setError("Something went wrong while trimming. Try a shorter selection or a different file.");
    }
  }

  const downloadName = (() => {
    const base = fileName.replace(/\.[^.]+$/, "") || "audio";
    return `${base}-trimmed.wav`;
  })();

  const selDur = Math.max(0, end - start);
  const hasFile = duration > 0;

  return (
    <div className="tool">
      <div className="tool-field">
        <label className="tool-label" htmlFor="at-file">
          Choose an audio file
        </label>
        <input
          id="at-file"
          className="tool-input"
          type="file"
          accept="audio/*,.mp3,.wav,.ogg,.m4a,.aac,.flac,.webm"
          onChange={onFile}
        />
        <p className="tool-note">
          Everything happens in your browser — your audio is never uploaded to a server.
        </p>
      </div>

      {loading && <p className="tool-note">Decoding audio…</p>}

      {previewUrl && (
        <div className="tool-field">
          {/* eslint-disable-next-line jsx-a11y/media-has-caption */}
          <audio ref={audioRef} src={previewUrl} controls style={{ width: "100%" }} />
        </div>
      )}

      {hasFile && (
        <>
          <div className="tool-fields">
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-start">
                Start ({formatTime(start)})
              </label>
              <input
                id="at-start"
                className="tool-input"
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={start}
                onChange={(e) => onStartChange(e.target.value)}
              />
            </div>
            <div className="tool-field">
              <label className="tool-label" htmlFor="at-end">
                End ({formatTime(end)})
              </label>
              <input
                id="at-end"
                className="tool-input"
                type="range"
                min="0"
                max={duration}
                step="0.01"
                value={end}
                onChange={(e) => onEndChange(e.target.value)}
              />
            </div>

            <div className="tool-row">
              <div className="tool-field">
                <label className="tool-label" htmlFor="at-start-num">
                  Start (seconds)
                </label>
                <input
                  id="at-start-num"
                  className="tool-input"
                  type="number"
                  min="0"
                  max={duration}
                  step="0.01"
                  inputMode="decimal"
                  value={start.toFixed(2)}
                  onChange={(e) => onStartChange(e.target.value)}
                />
              </div>
              <div className="tool-field">
                <label className="tool-label" htmlFor="at-end-num">
                  End (seconds)
                </label>
                <input
                  id="at-end-num"
                  className="tool-input"
                  type="number"
                  min="0"
                  max={duration}
                  step="0.01"
                  inputMode="decimal"
                  value={end.toFixed(2)}
                  onChange={(e) => onEndChange(e.target.value)}
                />
              </div>
            </div>

            <div className="tool-field">
              <label className="tool-label" htmlFor="at-fade">
                <input
                  id="at-fade"
                  type="checkbox"
                  checked={fade}
                  onChange={(e) => {
                    setFade(e.target.checked);
                    resetOutput();
                  }}
                />{" "}
                Add a tiny fade in/out to avoid clicks
              </label>
            </div>
          </div>

          <div className="tool-stat-grid" role="status" aria-live="polite">
            <div className="tool-stat">
              <div className="tool-stat-num">{formatTime(duration)}</div>
              <div className="tool-stat-label">Full length</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatTime(selDur)}</div>
              <div className="tool-stat-label">Selection</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{formatBytes(origSize)}</div>
              <div className="tool-stat-label">Original file</div>
            </div>
            <div className="tool-stat">
              <div className="tool-stat-num">{outSize ? formatBytes(outSize) : "—"}</div>
              <div className="tool-stat-label">Trimmed WAV</div>
            </div>
          </div>

          <p className="tool-note">
            The clip between your start and end points is exported as a lossless WAV file. Use
            &ldquo;Preview selection&rdquo; to hear exactly what will be saved.
          </p>
        </>
      )}

      {error && (
        <p className="tool-error" role="alert">
          {error}
        </p>
      )}

      {hasFile && (
        <div className="tool-actions">
          <button
            type="button"
            className="btn btn-primary"
            onClick={trimAndDownload}
            disabled={busy || selDur <= 0.001}
          >
            {busy ? "Trimming…" : "Trim & Download WAV"}
          </button>
          <button type="button" className="btn" onClick={previewSelection} disabled={busy}>
            ▶ Preview selection
          </button>
          {outUrl && (
            <a className="btn btn-success" href={outUrl} download={downloadName}>
              ↓ Download WAV
            </a>
          )}
        </div>
      )}

      {!hasFile && !loading && (
        <p className="tool-note">
          Choose an audio file above to set start and end points and export a trimmed clip.
        </p>
      )}
    </div>
  );
}
