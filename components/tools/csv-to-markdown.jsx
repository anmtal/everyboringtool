"use client";
import TextConvert from "./_text-convert";
import { csvToMarkdown } from "../../lib/dataConvert";

export default function CsvToMarkdown() {
  return (
    <TextConvert
      inLabel="Paste your CSV (first row = headers)"
      outLabel="Markdown table"
      actionLabel="Convert to Markdown"
      transform={csvToMarkdown}
      downloadName="table.md"
      downloadMime="text/markdown"
      placeholder={"name,role,city\nAda,Engineer,London\nGrace,Admiral,New York"}
    />
  );
}
