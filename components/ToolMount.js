"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useRef } from "react";
import { trackEvent } from "../lib/analytics";

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

  const shellRef = useRef(null);
  const firedRef = useRef(false);

  // Fire one GA4 "tool_use" event the first time a visitor actually runs the tool
  // (clicks its primary/submit button or selects a file). Delegated on the shell
  // so it covers every tool without touching the 274 components, and fires at most
  // once per load so a single visit counts once.
  useEffect(() => {
    firedRef.current = false;
    const el = shellRef.current;
    if (!el) return;

    function fire(action) {
      if (firedRef.current) return;
      firedRef.current = true;
      trackEvent("tool_use", { tool_slug: slug, tool_action: action || "" });
    }
    function onClick(e) {
      const btn = e.target.closest && e.target.closest("button");
      if (!btn) return;
      if (btn.classList.contains("btn-primary") || btn.type === "submit") {
        fire((btn.textContent || "").trim().slice(0, 40));
      }
    }
    function onChange(e) {
      const t = e.target;
      if (t && t.matches && t.matches('input[type="file"]')) fire("file-selected");
    }

    el.addEventListener("click", onClick);
    el.addEventListener("change", onChange);
    return () => {
      el.removeEventListener("click", onClick);
      el.removeEventListener("change", onChange);
    };
  }, [slug]);

  return (
    <div className="tool-shell" ref={shellRef}>
      <Tool />
    </div>
  );
}
