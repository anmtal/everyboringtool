"use client";

// Shared engine for the browser video toolkit. Every video tool (compress,
// convert, mute, to-gif…) is a thin UI over runVideoJob(): it hands in a File
// and an ffmpeg arg-builder, and gets back a downloadable Blob. All processing
// is local — the file is never uploaded. Built on the same single-threaded core
// (lib/ffmpegClient) already shared by the Audio & Video tools.
import { loadFFmpeg, fetchFile } from "./ffmpegClient";

export function fmtBytes(n) {
  if (n < 1024) return n + " B";
  if (n < 1048576) return (n / 1024).toFixed(1) + " KB";
  return (n / 1048576).toFixed(1) + " MB";
}

// The container extension of the picked file (without the dot), lowercased.
export function inputExt(file, fallback = "mp4") {
  const m = file && file.name && file.name.match(/\.([a-z0-9]+)$/i);
  return (m ? m[1] : fallback).toLowerCase();
}

// Build an Error that carries a plain-English `userMessage` for the UI while the
// technical detail (exit code, ffmpeg log tail) stays in `message` for the console.
function jobError(userMessage, detail) {
  const err = new Error(detail ? userMessage + " [" + detail + "]" : userMessage);
  err.userMessage = userMessage;
  return err;
}

// The last few non-empty ffmpeg log lines — that is where the real reason lives.
function logTail(lines, n = 3) {
  const kept = lines.filter((l) => l && l.trim()).slice(-n);
  return kept.length ? "ffmpeg: " + kept.join(" | ") : "";
}

// Run one ffmpeg job. buildArgs(inName, outName) returns the argv array.
// onStatus/onProgress are optional UI callbacks. Returns { url, name, size, blob, mime }.
export async function runVideoJob({
  file,
  outExt,
  outMime,
  buildArgs,
  baseName,
  onStatus,
  onProgress,
}) {
  if (onStatus) onStatus("Loading video engine (~32 MB, one-time)…");
  const ff = await loadFFmpeg();
  const onProg = ({ progress }) =>
    onProgress && onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
  // Keep a short rolling tail of ffmpeg's own log so a failed run can explain itself.
  const logLines = [];
  const onLog = ({ message }) => {
    if (!message) return;
    logLines.push(String(message));
    if (logLines.length > 40) logLines.shift();
  };
  ff.on("progress", onProg);
  ff.on("log", onLog);
  const inName = "input." + inputExt(file);
  const outName = "output." + outExt;
  try {
    if (onStatus) onStatus("Reading your file…");
    await ff.writeFile(inName, await fetchFile(file));
    if (onStatus) onStatus("Processing — this can take a moment for large files…");
    // exec() RESOLVES with ffmpeg's exit code, it does not throw on failure —
    // ignoring it reported broken encodes as "Done".
    const code = await ff.exec(buildArgs(inName, outName));
    if (code !== 0) {
      throw jobError(
        "The video engine couldn't finish this file — it may use a format or feature the in-browser engine doesn't support. Try a different output format or a shorter clip.",
        ("ffmpeg exited with code " + code + " " + logTail(logLines)).trim()
      );
    }
    // A missing or 0-byte output is also a failure, however the exit code looked.
    let data = null;
    try {
      data = await ff.readFile(outName);
    } catch {
      data = null;
    }
    const bytes = data ? (data.byteLength != null ? data.byteLength : data.length) : 0;
    if (!bytes) {
      throw jobError(
        "The video engine finished but produced an empty file. Try a different output format or a shorter clip.",
        logTail(logLines)
      );
    }
    const blob = new Blob([data.buffer || data], { type: outMime });
    const stem = (baseName || (file.name || "output").replace(/\.[^.]+$/, "")) || "output";
    return { url: URL.createObjectURL(blob), name: `${stem}.${outExt}`, size: blob.size, blob, mime: outMime };
  } finally {
    ff.off("progress", onProg);
    ff.off("log", onLog);
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

export { loadFFmpeg };
