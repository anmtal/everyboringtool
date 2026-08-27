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

// Run one ffmpeg job. buildArgs(inName, outName) returns the argv array.
// onStatus/onProgress are optional UI callbacks. Returns { url, name, size, blob }.
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
  ff.on("progress", onProg);
  const inName = "input." + inputExt(file);
  const outName = "output." + outExt;
  try {
    if (onStatus) onStatus("Reading your file…");
    await ff.writeFile(inName, await fetchFile(file));
    if (onStatus) onStatus("Processing — this can take a moment for large files…");
    await ff.exec(buildArgs(inName, outName));
    const data = await ff.readFile(outName);
    const blob = new Blob([data.buffer], { type: outMime });
    const stem = (baseName || (file.name || "output").replace(/\.[^.]+$/, "")) || "output";
    return { url: URL.createObjectURL(blob), name: `${stem}.${outExt}`, size: blob.size, blob };
  } finally {
    ff.off("progress", onProg);
    await ff.deleteFile(inName).catch(() => {});
    await ff.deleteFile(outName).catch(() => {});
  }
}

export { loadFFmpeg };
