"use client";

import VideoToolShell from "./_video-shell";
import { inputExt } from "../../lib/videoTool";

// Strip the audio track without re-encoding the video (-c:v copy -an): fast,
// lossless, and keeps the original container.
const MIME = { mp4: "video/mp4", mov: "video/quicktime", mkv: "video/x-matroska", webm: "video/webm", avi: "video/x-msvideo", m4v: "video/mp4" };
const ACCEPT = (f) => f.type.startsWith("video/") || /\.(mp4|mov|mkv|webm|avi|m4v|3gp|flv|wmv)$/i.test(f.name);

export default function MuteVideo() {
  return (
    <VideoToolShell
      accept="video/*"
      acceptTest={ACCEPT}
      hint="MP4, MOV, WEBM, MKV, AVI and more"
      actionLabel="Remove audio"
      buildJob={(file) => {
        const ext = inputExt(file);
        return {
          outExt: ext,
          outMime: MIME[ext] || "video/mp4",
          baseName: (file.name.replace(/\.[^.]+$/, "") || "video") + "-muted",
          buildArgs: (i, o) => ["-i", i, "-c:v", "copy", "-an", o],
        };
      }}
    />
  );
}
