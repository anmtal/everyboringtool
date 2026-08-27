"use client";

import VideoToolShell from "./tools/_video-shell";
import { FORMATS } from "../lib/convertMatrix";

// The interactive converter for one {from,to} pair, over the shared video shell.
const VIDEO_RE = /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv|ts)$/i;
const AUDIO_RE = /\.(mp3|wav|m4a|ogg|aac|flac|opus|wma|aiff)$/i;

export default function ConvertWidget({ from, to }) {
  const f = FORMATS[from];
  const t = FORMATS[to];
  if (!f || !t) return null;
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
