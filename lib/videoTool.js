"use client";

// Shared engine for the browser video toolkit. Every video tool (compress,
// convert, mute, to-gif…) is a thin UI over runVideoJob(): it hands in a File
// and an ffmpeg arg-builder, and gets back a downloadable Blob. All processing
// is local — the file is never uploaded. Built on the same single-threaded core
// (lib/ffmpegClient) already shared by the Audio & Video tools.
import { loadFFmpeg, fetchFile, terminateFFmpeg } from "./ffmpegClient";

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
  onStall,
  signal,
}) {
  if (signal && signal.aborted) throw jobError("Canceled.", "aborted before start");
  if (onStatus) onStatus("Loading video engine (~32 MB, one-time)…");
  const ff = await loadFFmpeg();

  // Watchdog: ffmpeg emits progress/log lines while it works; if it goes quiet
  // for a stretch it is usually thrashing memory on a too-large file, so flag
  // that (onStall) instead of leaving an eternal spinner.
  let lastTick = Date.now();
  let stalled = false;
  const bump = () => {
    lastTick = Date.now();
    if (stalled) {
      stalled = false;
      if (onStall) onStall(false);
    }
  };
  const onProg = ({ progress }) => {
    bump();
    if (onProgress) onProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
  };
  // Keep a short rolling tail of ffmpeg's own log so a failed run can explain itself.
  const logLines = [];
  const onLog = ({ message }) => {
    if (!message) return;
    bump();
    logLines.push(String(message));
    if (logLines.length > 40) logLines.shift();
  };
  ff.on("progress", onProg);
  ff.on("log", onLog);
  const STALL_MS = 45000;
  const watch = setInterval(() => {
    if (!stalled && Date.now() - lastTick > STALL_MS) {
      stalled = true;
      if (onStall) onStall(true);
    }
  }, 5000);

  // Cancel: the single-thread core can't abort one exec(), so a user cancel (or
  // an out-of-memory hang they give up on) terminates the whole worker. Racing
  // the ffmpeg calls against this rejection frees the UI immediately.
  let abortReject = null;
  const abortP = new Promise((_, reject) => {
    abortReject = reject;
  });
  abortP.catch(() => {}); // mark handled — reject can fire before the first Promise.race attaches (Cancel during engine load)
  const onAbort = () => {
    terminateFFmpeg();
    if (abortReject) abortReject(jobError("Canceled.", "user canceled"));
  };
  if (signal) signal.addEventListener("abort", onAbort, { once: true });

  const inName = "input." + inputExt(file);
  const outName = "output." + outExt;
  try {
    if (onStatus) onStatus("Reading your file…");
    await Promise.race([ff.writeFile(inName, await fetchFile(file)), abortP]);
    if (onStatus) onStatus("Processing — this can take a moment for large files…");
    // exec() RESOLVES with ffmpeg's exit code, it does not throw on failure —
    // ignoring it reported broken encodes as "Done".
    const code = await Promise.race([ff.exec(buildArgs(inName, outName)), abortP]);
    if (code !== 0) {
      throw jobError(
        "The video engine couldn't finish this file — it may use a format the in-browser engine doesn't support, or it may be too large for the browser's memory. Try a different output format or a shorter, lower-resolution clip.",
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
    clearInterval(watch);
    if (signal) signal.removeEventListener("abort", onAbort);
    // After a terminate (cancel / OOM) the instance is already gone, so these
    // throw — cleanup is moot then. Guard every call.
    try {
      ff.off("progress", onProg);
      ff.off("log", onLog);
    } catch {
      /* terminated */
    }
    try {
      await ff.deleteFile(inName);
    } catch {
      /* terminated or never written */
    }
    try {
      await ff.deleteFile(outName);
    } catch {
      /* terminated or never written */
    }
  }
}

export { loadFFmpeg };
