"use client";

import dynamic from "next/dynamic";
import { useMemo } from "react";

// Loads a built tool by slug from components/tools/<slug>.jsx (client-only).
export default function ToolMount({ slug }) {
  const Tool = useMemo(
    () =>
      dynamic(() => import(`./tools/${slug}.jsx`), {
        ssr: false,
        loading: () => <div className="tool-loading">Loading tool…</div>,
      }),
    [slug]
  );
  return (
    <div className="tool-shell">
      <Tool />
    </div>
  );
}
