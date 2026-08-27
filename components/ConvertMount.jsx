"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// Client-only boundary for the converter widget, so the page's H1/About/FAQ/schema
// stay server-rendered (good for SEO/AEO) and only the ffmpeg-powered UI is
// hydrated client-side — the same split ToolMount uses for the regular tools.
export default function ConvertMount({ from, to }) {
  const Widget = useMemo(
    () =>
      dynamic(() => import("./ConvertWidget"), {
        ssr: false,
        loading: () => <div className="tool-loading">Loading tool…</div>,
      }),
    []
  );
  return (
    <div className="tool-shell">
      <Widget from={from} to={to} />
    </div>
  );
}
