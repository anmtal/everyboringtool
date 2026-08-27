"use client";
import TextConvert from "./_text-convert";
import { csvToHtml } from "../../lib/dataConvert";

export default function CsvToHtml() {
  return (
    <TextConvert
      inLabel="Paste your CSV (first row = headers)"
      outLabel="HTML table"
      actionLabel="Convert to HTML"
      transform={csvToHtml}
      downloadName="table.html"
      downloadMime="text/html"
      placeholder={"name,role,city\nAda,Engineer,London\nGrace,Admiral,New York"}
    />
  );
}
