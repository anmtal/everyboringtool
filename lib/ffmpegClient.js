"use client";

import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

let ff = null;
let loadPromise = null;

function instance() {
  if (!ff) ff = new FFmpeg();
  return ff;
}

// Lazily load the single-threaded ffmpeg core (~32 MB) exactly once, shared across
// every Audio/Video tool. Single-thread core needs no COOP/COEP headers, so it can
// never affect the rest of the site.
export async function loadFFmpeg() {
  const f = instance();
  if (f.loaded) return f;
  if (!loadPromise) {
    loadPromise = (async () => {
      const base = `${window.location.origin}/ffmpeg`;
      await f.load({
        coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, "text/javascript"),
        wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, "application/wasm"),
      });
    })();
    // A rejected promise stays rejected. Without clearing it, one failed load
    // (flaky connection on a 32 MB download) permanently bricked all five
    // Audio/Video tools until a full page reload. Clearing lets a retry work.
    loadPromise.catch(() => {
      loadPromise = null;
      ff = null;
    });
  }
  await loadPromise;
  return f;
}

// Kill the running ffmpeg worker and drop the shared instance so the next
// loadFFmpeg() builds a fresh one. The single-threaded core can't abort a
// single exec() mid-run, so a user "Cancel" (or an out-of-memory hang) has to
// terminate the whole worker; a clean instance loads again on the next job.
export function terminateFFmpeg() {
  const cur = ff;
  ff = null;
  loadPromise = null;
  if (cur) {
    try {
      cur.terminate();
    } catch {
      /* worker already gone */
    }
  }
}

// In-browser ffmpeg keeps the whole input (plus a working copy) in a WASM heap
// capped around 2 GB, single-threaded. Past a couple hundred MB the odds of an
// out-of-memory stall climb fast, so tools warn before spending the user's time.
export const LARGE_FILE_BYTES = 200 * 1024 * 1024;

// A plain-English caution when a file is big enough to risk an out-of-memory
// stall in the browser engine, else null. Tools show it and let the user decide
// rather than block — someone may genuinely want to try.
export function sizeWarning(file) {
  if (!file || !file.size || file.size <= LARGE_FILE_BYTES) return null;
  const mb = Math.round(file.size / (1024 * 1024));
  const limit = Math.round(LARGE_FILE_BYTES / (1024 * 1024));
  return `Heads up: this file is large (${mb} MB). It's processed privately in your browser, which works best under about ${limit} MB — bigger files can be very slow or run out of memory. You can try anyway, or use a shorter or lower-resolution clip.`;
}

export { fetchFile };
