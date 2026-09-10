"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile, sizeWarning, terminateFFmpeg } from "../../lib/ffmpegClient";
import { fmtBytes, inputExt } from "../../lib/videoTool";

// Two inputs (video + subtitle) and two modes:
//  burn — hardcode the text into the pixels (always visible; needs a font, which
//         we bundle at /fonts/subtitle-font.ttf and hand to libass via fontsdir)
//  soft — mux the subtitles as a selectable track (fast stream-copy; MP4/MOV)
const VIDEO_OK = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v)$/i.test(f.name);
const SUB_OK = (f) => /\.(srt|vtt|ass|ssa)$/i.test(f.name);

export default function AddSubtitles() {
  const [video, setVideo] = useState(null);
  const [subs, setSubs] = useState(null);
  const [mode, setMode] = useState("burn");
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState("");
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);
  const [warn, setWarn] = useState("");
  const [canceled, setCanceled] = useState(false);
  const vRef = useRef(null);
  const sRef = useRef(null);
  const abortRef = useRef(null);
  const canceledRef = useRef(false);

  useEffect(() => () => { if (result && result.url) URL.revokeObjectURL(result.url); }, [result]);

  function pickVideo(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null); setCanceled(false);
    if (!VIDEO_OK(f)) { setError("Please choose a video file."); return; }
    setVideo(f);
    const big = subs && subs.size > f.size ? subs : f;
    setWarn(sizeWarning(big) || "");
  }
  function pickSubs(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null); setCanceled(false);
    if (!SUB_OK(f)) { setError("Please choose a subtitle file (.srt, .vtt or .ass)."); return; }
    setSubs(f);
    const big = video && video.size > f.size ? video : f;
    setWarn(sizeWarning(big) || "");
  }

  const run = useCallback(async () => {
    if (!video || !subs) return;
    canceledRef.current = false;
    setCanceled(false);
    setBusy(true); setError(""); setResult(null); setProgress(0);
    let ff;
    let abortReject = null;
    const abortP = new Promise((_, rej) => { abortReject = rej; });
    abortP.catch(() => {}); // mark handled — reject can fire before the first Promise.race attaches (Cancel during engine load)
    const onAbort = () => {
      terminateFFmpeg();
      if (abortReject) abortReject(Object.assign(new Error("Canceled."), { userMessage: "Canceled." }));
    };
    abortRef.current = onAbort;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading video engine (~32 MB, one-time)…");
      ff = await Promise.race([loadFFmpeg(), abortP]);
      ff.on("progress", onProg);
      const inName = "input." + inputExt(video);
      const subExt = ((subs.name.match(/\.([a-z0-9]+)$/i) || [null, "srt"])[1]).toLowerCase();
      const subName = "subs." + subExt;
      const outName = "output.mp4";
      setStatus("Reading your files…");
      await Promise.race([ff.writeFile(inName, await fetchFile(video)), abortP]);
      await Promise.race([ff.writeFile(subName, await fetchFile(subs)), abortP]);

      let args;
      if (mode === "burn") {
        setStatus("Loading font…");
        await Promise.race([ff.writeFile("font.ttf", await fetchFile(`${window.location.origin}/fonts/subtitle-font.ttf`)), abortP]);
        setStatus("Burning subtitles into the video…");
        args = [
          "-i", inName,
          "-vf", `subtitles=${subName}:fontsdir=.:force_style=Fontname=Liberation Sans`,
          "-c:v", "libx264", "-crf", "23", "-preset", "veryfast",
          "-c:a", "aac", "-b:a", "160k",
          "-movflags", "+faststart",
          outName,
        ];
      } else {
        setStatus("Adding the subtitle track…");
        args = [
          "-i", inName, "-i", subName,
          "-map", "0:v:0", "-map", "0:a?", "-map", "1:0",
          "-c:v", "copy", "-c:a", "copy", "-c:s", "mov_text",
          "-movflags", "+faststart",
          outName,
        ];
      }
      await Promise.race([ff.exec(args), abortP]);
      const data = await Promise.race([ff.readFile(outName), abortP]);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const base = (video.name.replace(/\.[^.]+$/, "") || "video") + "-subtitled";
      setResult({ url: URL.createObjectURL(blob), name: `${base}.mp4`, size: blob.size });
      setStatus("");
      try { for (const n of [inName, subName, outName, "font.ttf"]) await ff.deleteFile(n).catch(() => {}); } catch {}
    } catch (err) {
      if (canceledRef.current) {
        setCanceled(true);
      } else {
        setError(
          (err && err.userMessage) ||
            (mode === "burn"
              ? "Couldn't burn in the subtitles — check the subtitle file is a valid .srt, .vtt or .ass, or try the toggleable-track mode."
              : "Couldn't add the subtitle track — this mode works best with an MP4 or MOV video. For other formats, use burn-in.")
        );
      }
      setStatus("");
    } finally {
      if (ff) { try { ff.off("progress", onProg); } catch {} }
      abortRef.current = null;
      setBusy(false); setProgress(0);
    }
  }, [video, subs, mode]);

  // Cancel terminates the ffmpeg worker (the single-thread core can't stop one
  // exec mid-run), freeing the UI and memory instead of a stuck "Working…".
  const cancel = useCallback(() => {
    canceledRef.current = true;
    setStatus("Canceling…");
    if (abortRef.current) abortRef.current();
  }, []);

  return (
    <div className="tool">
      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        onClick={() => !busy && vRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), vRef.current?.click())}
      >
        <input ref={vRef} type="file" accept="video/*" onChange={pickVideo} hidden />
        <p className="dropzone-title">{video ? video.name : "1. Choose a video file"}</p>
        <p className="dropzone-sub">{video ? fmtBytes(video.size) + " — runs in your browser, nothing uploaded" : "MP4, MOV, WEBM, MKV and more"}</p>
      </div>

      <div
        className="dropzone"
        role="button"
        tabIndex={0}
        style={{ marginTop: 10 }}
        onClick={() => !busy && sRef.current?.click()}
        onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && !busy && (e.preventDefault(), sRef.current?.click())}
      >
        <input ref={sRef} type="file" accept=".srt,.vtt,.ass,.ssa,text/plain" onChange={pickSubs} hidden />
        <p className="dropzone-title">{subs ? subs.name : "2. Choose a subtitle file"}</p>
        <p className="dropzone-sub">{subs ? fmtBytes(subs.size) : ".srt, .vtt or .ass"}</p>
      </div>

      <div className="tool-fields">
        <div className="tool-field">
          <label className="tool-label" htmlFor="sub-mode">How to add them</label>
          <select id="sub-mode" className="tool-select" value={mode} onChange={(e) => setMode(e.target.value)} disabled={busy}>
            <option value="burn">Burn in — always visible, works everywhere</option>
            <option value="soft">Add as a track — viewer can turn on/off</option>
          </select>
        </div>
      </div>

      {warn && !busy && (
        <p className="tool-note" role="note" style={{ borderLeft: "3px solid currentColor", paddingLeft: 10, opacity: 0.9 }}>⚠ {warn}</p>
      )}

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!video || !subs || busy}>
          {busy ? "Working…" : "Add subtitles"}
        </button>
        {busy && <button type="button" className="btn" onClick={cancel}>Cancel</button>}
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

      {canceled && !busy && (
        <p className="tool-note" role="status">Canceled. Pick your files and run again when you&rsquo;re ready.</p>
      )}

      {error && <p className="tool-error" role="alert">{error}</p>}

      {result && (
        <div className="tool-result" role="status" aria-live="polite">
          <p className="tool-result-label">Done — {fmtBytes(result.size)}</p>
          <video controls src={result.url} style={{ width: "100%", marginTop: 8, borderRadius: 8 }} />
          <div className="tool-actions" style={{ marginTop: 10 }}>
            <a className="btn btn-success" href={result.url} download={result.name}>↓ Download {(result.name.split(".").pop() || "file").toUpperCase()}</a>
          </div>
        </div>
      )}

      <p className="tool-note">
        Burn-in hardcodes the text into the picture, so it shows on every player and on social media. A track keeps the
        subtitles separate so the viewer can switch them on or off (best with MP4/MOV). The first run downloads a ~32 MB
        engine, cached afterwards — everything then runs on your device.
      </p>
    </div>
  );
}
