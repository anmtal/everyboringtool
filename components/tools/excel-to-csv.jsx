"use client";
import FileTool from "./_file-tool";

const XL = ".xlsx,.xls,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel";

export default function ExcelToCsv() {
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
        const csv = XLSX.utils.sheet_to_csv(ws);
        const blob = new Blob([csv], { type: "text/csv" });
        return { url: URL.createObjectURL(blob), name: (f.name.replace(/\.[^.]+$/, "") || "data") + ".csv", text: csv, note: `Converted the first sheet ("${wb.SheetNames[0]}").` };
      }}
    />
  );
}
