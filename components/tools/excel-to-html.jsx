"use client";
import FileTool from "./_file-tool";

const XL = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export default function ExcelToHtml() {
  return (
    <FileTool
      accept={XL}
      fileLabel="Choose an Excel file (.xlsx or .xls)"
      working="Reading the spreadsheet…"
      process={async (f) => {
        const m = await import("xlsx");
        const XLSX = m.utils ? m : m.default;
        const wb = XLSX.read(await f.arrayBuffer(), { type: "array" });
        const ws = wb.Sheets[wb.SheetNames[0]];
        let html = XLSX.utils.sheet_to_html(ws, { id: "table" });
        // sheet_to_html returns a full document; keep just the <table> for pasting.
        const mt = html.match(/<table[\s\S]*<\/table>/i);
        if (mt) html = mt[0];
        const blob = new Blob([html], { type: "text/html" });
        return { url: URL.createObjectURL(blob), name: (f.name.replace(/\.[^.]+$/, "") || "data") + ".html", text: html };
      }}
    />
  );
}
