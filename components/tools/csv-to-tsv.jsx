"use client";
import TextConvert from "./_text-convert";
import { csvToTsv } from "../../lib/dataConvert";

export default function CsvToTsv() {
  return (
    <TextConvert
      inLabel="Paste your CSV"
      outLabel="TSV (tab-separated)"
      actionLabel="Convert to TSV"
      transform={csvToTsv}
      downloadName="data.tsv"
      downloadMime="text/tab-separated-values"
      placeholder={"name,role,city\nAda,Engineer,London"}
    />
  );
}
