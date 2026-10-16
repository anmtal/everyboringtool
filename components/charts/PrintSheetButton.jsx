"use client";

import { trackEvent } from "../../lib/analytics";

// Prints one sheet of a chart page. Sections that belong to a sheet are direct
// children of .chart-page carrying data-sheets="<id> <id>…". On click the
// matching sections get .chart-print-target and <html> gets data-chart-print;
// the print stylesheet (the "Printable charts" block at the end of
// app/globals.css) then prints only those sections. Closed <details> inside them
// would print empty, so they are opened for the print and closed again after.
// Without a button (Ctrl+P) the whole chart page prints, and ChartPageEffects
// opens the collapsed blocks for that print.
export default function PrintSheetButton({ sheet, chart = "", label = "Print", className = "btn btn-sm" }) {
  function onClick() {
    const root = document.documentElement;
    const page = document.querySelector(".chart-page");
    if (!page) {
      window.print();
      return;
    }
    const targets = Array.from(page.querySelectorAll(":scope > [data-sheets]")).filter((el) =>
      (el.getAttribute("data-sheets") || "").split(/\s+/).includes(sheet)
    );
    const opened = [];
    for (const el of targets) {
      el.classList.add("chart-print-target");
      for (const d of el.querySelectorAll("details:not([open])")) {
        d.open = true;
        opened.push(d);
      }
    }
    root.setAttribute("data-chart-print", sheet);

    let done = false;
    const restore = () => {
      if (done) return;
      done = true;
      root.removeAttribute("data-chart-print");
      for (const el of targets) el.classList.remove("chart-print-target");
      for (const d of opened) d.open = false;
      window.removeEventListener("afterprint", restore);
    };
    window.addEventListener("afterprint", restore);
    trackEvent("chart_print", { chart, sheet });
    window.print();
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {label}
    </button>
  );
}
