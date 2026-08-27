"use client";
import FileTool from "./_file-tool";
import { parseCsv } from "../../lib/dataConvert";

const XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export default function CsvToExcel() {
  return (
    <FileTool
      accept=".csv,text/csv,text/plain"
      fileLabel="Choose a CSV file"
      working="Building your spreadsheet…"
      process={async (f) => {
        const m = await import("xlsx");
        const XLSX = m.utils ? m : m.default;
        const rows = parseCsv(await f.text());
        const ws = XLSX.utils.aoa_to_sheet(rows);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
        const buf = XLSX.write(wb, { type: "array", bookType: "xlsx" });
        const blob = new Blob([buf], { type: XLSX_MIME });
        return { url: URL.createObjectURL(blob), name: (f.name.replace(/\.[^.]+$/, "") || "data") + ".xlsx", note: `${rows.length} row${rows.length === 1 ? "" : "s"} written to an .xlsx spreadsheet.` };
      }}
    />
  );
}
