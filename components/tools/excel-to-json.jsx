"use client";
import FileTool from "./_file-tool";

const XL = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export default function ExcelToJson() {
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
        const json = JSON.stringify(XLSX.utils.sheet_to_json(ws, { defval: "" }), null, 2);
        const blob = new Blob([json], { type: "application/json" });
        return { url: URL.createObjectURL(blob), name: (f.name.replace(/\.[^.]+$/, "") || "data") + ".json", text: json, note: "Each row becomes an object keyed by the header row." };
      }}
    />
  );
}
