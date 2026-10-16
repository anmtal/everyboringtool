"use client";

import { useEffect } from "react";

// Mounted once on each chart page (renders nothing).
//
// 1. Ctrl+P or the browser's Print command: CSS cannot open a closed <details>,
//    so every collapsed block would print as a bare heading. Open them just
//    before printing and close them again afterwards. Blocks marked
//    data-print-closed (a worksheet's answer key) stay shut; the per-sheet
//    PrintSheetButton opens whatever its own sheet needs.
// 2. Jump links: the site header is sticky, and its height depends on how the
//    category row wraps, so it is measured into --chart-header-h on .chart-page.
//    The section scroll offset in app/globals.css uses it (with CSS fallbacks
//    for the moment before this runs).
export default function ChartPageEffects() {
  useEffect(() => {
    let opened = [];
    const beforePrint = () => {
      opened = Array.from(document.querySelectorAll(".chart-page details:not([open]):not([data-print-closed])"));
      for (const d of opened) d.open = true;
    };
    const afterPrint = () => {
      for (const d of opened) d.open = false;
      opened = [];
    };
    window.addEventListener("beforeprint", beforePrint);
    window.addEventListener("afterprint", afterPrint);

    const page = document.querySelector(".chart-page");
    const header = document.querySelector(".site-header");
    let observer = null;
    if (page && header) {
      const measure = () => {
        const h = Math.ceil(header.getBoundingClientRect().height);
        if (h > 0) page.style.setProperty("--chart-header-h", `${h}px`);
      };
      measure();
      if (typeof ResizeObserver !== "undefined") {
        observer = new ResizeObserver(measure);
        observer.observe(header);
      }
    }

    return () => {
      window.removeEventListener("beforeprint", beforePrint);
      window.removeEventListener("afterprint", afterPrint);
      if (observer) observer.disconnect();
      if (page) page.style.removeProperty("--chart-header-h");
    };
  }, []);

  return null;
}
