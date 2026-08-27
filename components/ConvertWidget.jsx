"use client";

import VideoToolShell from "./tools/_video-shell";
import ImageTool from "./tools/_image-tool";
import { FORMATS } from "../lib/convertMatrix";

// The interactive converter for one {from,to} pair. Image pairs run on the
// browser canvas; audio/video pairs run on the shared ffmpeg core.
const VIDEO_RE = /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv|ts)$/i;
const AUDIO_RE = /\.(mp3|wav|m4a|ogg|aac|flac|opus|wma|aiff)$/i;

export default function ConvertWidget({ from, to }) {
  const f = FORMATS[from];
  const t = FORMATS[to];
  if (!f || !t) return null;

  if (f.kind === "image") {
    const toJpg = to === "jpg";
    return (
      <ImageTool
        fileLabel={`Choose a ${f.name} image`}
        actionLabel={`Convert to ${t.name}`}
        outType={t.mime}
        outExt={to}
        outQuality={toJpg || to === "webp" ? 0.92 : undefined}
        draw={(ctx, img, o, c) => {
          c.width = img.naturalWidth || 512;
          c.height = img.naturalHeight || 512;
          if (toJpg) { ctx.fillStyle = "#ffffff"; ctx.fillRect(0, 0, c.width, c.height); }
          ctx.drawImage(img, 0, 0, c.width, c.height);
        }}
        note={<p className="tool-note">The {f.name} is decoded and re-saved as {t.name} in your browser — nothing is uploaded.</p>}
      />
    );
  }

  const inKind = f.kind; // "video" | "audio"
  const re = inKind === "audio" ? AUDIO_RE : VIDEO_RE;
  return (
    <VideoToolShell
      accept={inKind === "audio" ? "audio/*" : "video/*"}
      acceptTest={(file) => file.type.startsWith(inKind + "/") || re.test(file.name)}
      fileLabel={`Choose ${inKind === "audio" ? "an audio" : "a video"} file`}
      hint={`Upload your ${f.name} file — nothing is uploaded to a server`}
      actionLabel={`Convert to ${t.name}`}
      resultKind={t.kind === "audio" ? "audio" : t.kind === "image" ? "image" : "video"}
      buildJob={(file) => ({
        outExt: to,
        outMime: t.mime,
        baseName: file.name.replace(/\.[^.]+$/, "") || "converted",
        buildArgs: t.args,
      })}
    />
  );
}
