"use client";

import { useState, useRef, useCallback } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";
import { copyText } from "../../lib/copyText";

const MODELS = {
  fast: { id: "Xenova/whisper-tiny.en", label: "Fast — good for clear speech (~40 MB)" },
  balanced: { id: "Xenova/whisper-base.en", label: "Accurate — slower (~80 MB)" },
};

function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

function tParts(sec) {
  const s = Math.max(0, sec || 0);
  const ms = Math.floor((s % 1) * 1000);
  const t = Math.floor(s);
  return {
    hh: String(Math.floor(t / 3600)).padStart(2, "0"),
    mm: String(Math.floor((t % 3600) / 60)).padStart(2, "0"),
    ss: String(t % 60).padStart(2, "0"),
    ms: String(ms).padStart(3, "0"),
  };
}
const srtTime = (s) => { const p = tParts(s); return `${p.hh}:${p.mm}:${p.ss},${p.ms}`; };
const vttTime = (s) => { const p = tParts(s); return `${p.hh}:${p.mm}:${p.ss}.${p.ms}`; };

function buildSrt(chunks) {
  return chunks.map((c, i) => {
    const [a, b] = c.timestamp || [];
    return `${i + 1}\n${srtTime(a)} --> ${srtTime(b == null ? a + 2 : b)}\n${(c.text || "").trim()}\n`;
  }).join("\n");
}
function buildVtt(chunks) {
  return "WEBVTT\n\n" + chunks.map((c) => {
    const [a, b] = c.timestamp || [];
    return `${vttTime(a)} --> ${vttTime(b == null ? a + 2 : b)}\n${(c.text || "").trim()}\n`;
  }).join("\n");
}

// Decode ffmpeg's 16 kHz mono pcm_s16le WAV to a Float32Array in [-1, 1].
// Parsed manually rather than via decodeAudioData, which would resample to the
// AudioContext rate and break Whisper's 16 kHz expectation.
function wavToFloat32(bytes) {
  const dv = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let off = 12, dataOff = -1, dataLen = 0;
  while (off + 8 <= dv.byteLength) {
    const id = String.fromCharCode(dv.getUint8(off), dv.getUint8(off + 1), dv.getUint8(off + 2), dv.getUint8(off + 3));
    const size = dv.getUint32(off + 4, true);
    if (id === "data") { dataOff = off + 8; dataLen = size; break; }
    off += 8 + size + (size % 2);
  }
  if (dataOff < 0) throw new Error("no-data-chunk");
  const n = Math.floor(dataLen / 2);
  const out = new Float32Array(n);
  for (let i = 0; i < n; i++) out[i] = dv.getInt16(dataOff + i * 2, true) / 32768;
  return out;
}

function saveBlob(text, name, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement("a");
  a.href = url; a.download = name;
  document.body.appendChild(a); a.click(); document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export default function VideoToText() {
  const [file, setFile] = useState(null);
  const [quality, setQuality] = useState("balanced");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null); // { text, chunks }
  const [copied, setCopied] = useState(false);
  const inputRef = useRef(null);

  function onPick(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!f.type.startsWith("audio/") && !f.type.startsWith("video/") &&
        !/\.(mp4|mov|mkv|webm|avi|m4v|mp3|wav|m4a|aac|ogg|flac|opus)$/i.test(f.name)) {
      setError("Please choose an audio or video file.");
      return;
    }
    setFile(f);
  }

  const run = useCallback(async () => {
    if (!file) return;
    setBusy(true); setError(""); setResult(null); setProgress(0);
    try {
      // 1) Extract 16 kHz mono audio with ffmpeg.
      setStatus("Loading audio engine (~32 MB, one-time)…");
      const ff = await loadFFmpeg();
      const ext = (file.name.match(/\.[a-z0-9]+$/i) || [".mp4"])[0];
      const inName = "in" + ext;
      setStatus("Extracting the audio…");
      await ff.writeFile(inName, await fetchFile(file));
      await ff.exec(["-i", inName, "-ar", "16000", "-ac", "1", "-f", "wav", "-acodec", "pcm_s16le", "out.wav"]);
      const wav = await ff.readFile("out.wav");
      await ff.deleteFile(inName).catch(() => {});
      await ff.deleteFile("out.wav").catch(() => {});
      const audio = wavToFloat32(wav);

      // 2) Load the speech model (cached after the first run).
      setStatus("Loading the speech model (first run downloads it)…");
      const { pipeline } = await import("@xenova/transformers");
      const transcriber = await pipeline("automatic-speech-recognition", MODELS[quality].id, {
        progress_callback: (p) => {
          if (p && p.status === "progress" && typeof p.progress === "number") {
            setProgress(Math.round(p.progress));
            setStatus(`Downloading the speech model… ${Math.round(p.progress)}%`);
          }
        },
      });

      // 3) Transcribe.
      setStatus("Transcribing… this can take a few minutes for long files.");
      setProgress(0);
      const out = await transcriber(audio, { chunk_length_s: 30, stride_length_s: 5, return_timestamps: true });
      const text = (out.text || "").trim();
      const chunks = Array.isArray(out.chunks) ? out.chunks.filter((c) => c && c.timestamp) : [];
      if (!text) setError("No speech was found in that file.");
      else setResult({ text, chunks });
      setStatus("");
    } catch (e) {
      setError("Couldn't transcribe that file — it may be an unsupported format, contain no speech, or be too large for the browser to handle.");
      setStatus("");
    } finally {
      setBusy(false); setProgress(0);
    }
  }, [file, quality]);

  const copy = useCallback(async () => {
    if (!result) return;
    try { await copyText(result.text); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ }
  }, [result]);

  const base = file ? file.name.replace(/\.[^.]+$/, "") : "transcript";

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        aria-disabled={busy}
        onClick={() => !busy && inputRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), inputRef.current?.click())}
        style={busy ? { opacity: 0.6, cursor: "progress" } : undefined}
      >
        <input ref={inputRef} type="file" accept="audio/*,video/*" onChange={onPick} hidden />
        <p className="dropzone-title">{file ? file.name : "Choose an audio or video file"}</p>
        <p className="dropzone-sub">{file ? fmtBytes(file.size) + " — nothing is uploaded" : "MP4, MOV, MP3, WAV, M4A and more"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="v2t-quality">Quality</label>
          <select id="v2t-quality" className="tool-select" value={quality} onChange={(e) => setQuality(e.target.value)} disabled={busy}>
            {Object.entries(MODELS).map(([k, v]) => <option key={k} value={k}>{v.label}</option>)}
          </select>
        </div>
      </div>

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!file || busy}>
          {busy ? "Working…" : "Transcribe"}
        </button>
      </div>

      {busy && (
        <div className="tool-note" aria-live="polite">
          {status}
          {progress > 0 && (
            <div style={{ marginTop: 8, height: 8, borderRadius: 4, background: "rgba(128,128,128,0.25)", overflow: "hidden" }}>
              <div style={{ width: progress + "%", height: "100%", background: "currentColor", opacity: 0.7, transition: "width 150ms" }} />
            </div>
          )}
        </div>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <div className="tool-actions" style={{ marginBottom: 8, flexWrap: "wrap" }}>
            <button type="button" className={copied ? "btn btn-success" : "btn btn-primary"} onClick={copy}>{copied ? "Copied!" : "Copy text"}</button>
            <button type="button" className="btn" onClick={() => saveBlob(result.text, `${base}.txt`, "text/plain")}>↓ .txt</button>
            {result.chunks.length > 0 && (
              <>
                <button type="button" className="btn" onClick={() => saveBlob(buildSrt(result.chunks), `${base}.srt`, "text/plain")}>↓ .srt subtitles</button>
                <button type="button" className="btn" onClick={() => saveBlob(buildVtt(result.chunks), `${base}.vtt`, "text/vtt")}>↓ .vtt subtitles</button>
              </>
            )}
          </div>
          <pre className="tool-output" style={{ whiteSpace: "pre-wrap", wordBreak: "break-word", maxHeight: 360, overflow: "auto" }}>{result.text}</pre>
        </div>
      )}

      <p className="tool-note">
        Transcribes speech from any audio or video file, right in your browser — your file is never uploaded.
        The first run downloads a speech model (cached afterwards). Long files take a while; a computer with WebGPU is
        much faster than a phone. Subtitle timestamps are approximate.
      </p>
    </div>
  );
}
