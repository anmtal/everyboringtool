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

export { fetchFile };
