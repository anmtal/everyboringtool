"use client";

import { useState, useRef, useCallback, useEffect } from "react";
import { loadFFmpeg, fetchFile } from "../../lib/ffmpegClient";
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
  const vRef = useRef(null);
  const sRef = useRef(null);

  useEffect(() => () => { if (result && result.url) URL.revokeObjectURL(result.url); }, [result]);

  function pickVideo(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!VIDEO_OK(f)) { setError("Please choose a video file."); return; }
    setVideo(f);
  }
  function pickSubs(e) {
    const f = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!f) return;
    setError(""); setResult(null);
    if (!SUB_OK(f)) { setError("Please choose a subtitle file (.srt, .vtt or .ass)."); return; }
    setSubs(f);
  }

  const run = useCallback(async () => {
    if (!video || !subs) return;
    setBusy(true); setError(""); setResult(null); setProgress(0);
    let ff;
    const onProg = ({ progress }) => setProgress(Math.max(0, Math.min(100, Math.round(progress * 100))));
    try {
      setStatus("Loading video engine (~32 MB, one-time)…");
      ff = await loadFFmpeg();
      ff.on("progress", onProg);
      const inName = "input." + inputExt(video);
      const subExt = ((subs.name.match(/\.([a-z0-9]+)$/i) || [null, "srt"])[1]).toLowerCase();
      const subName = "subs." + subExt;
      const outName = "output.mp4";
      setStatus("Reading your files…");
      await ff.writeFile(inName, await fetchFile(video));
      await ff.writeFile(subName, await fetchFile(subs));

      let args;
      if (mode === "burn") {
        setStatus("Loading font…");
        await ff.writeFile("font.ttf", await fetchFile(`${window.location.origin}/fonts/subtitle-font.ttf`));
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
      await ff.exec(args);
      const data = await ff.readFile(outName);
      const blob = new Blob([data.buffer], { type: "video/mp4" });
      const base = (video.name.replace(/\.[^.]+$/, "") || "video") + "-subtitled";
      setResult({ url: URL.createObjectURL(blob), name: `${base}.mp4`, size: blob.size });
      setStatus("");
      for (const n of [inName, subName, outName, "font.ttf"]) await ff.deleteFile(n).catch(() => {});
    } catch {
      setError(
        mode === "burn"
          ? "Couldn't burn in the subtitles — check the subtitle file is a valid .srt, .vtt or .ass, or try the toggleable-track mode."
          : "Couldn't add the subtitle track — this mode works best with an MP4 or MOV video. For other formats, use burn-in."
      );
      setStatus("");
    } finally {
      if (ff) ff.off("progress", onProg);
      setBusy(false); setProgress(0);
    }
  }, [video, subs, mode]);

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

      <div className="tool-actions">
        <button type="button" className="btn btn-primary" onClick={run} disabled={!video || !subs || busy}>
          {busy ? "Working…" : "Add subtitles"}
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
