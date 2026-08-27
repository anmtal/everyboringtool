"use client";
import TextConvert from "./_text-convert";
import { tsvToCsv } from "../../lib/dataConvert";

export default function TsvToCsv() {
  return (
    <TextConvert
      inLabel="Paste your TSV (tab-separated)"
      outLabel="CSV"
      actionLabel="Convert to CSV"
      transform={tsvToCsv}
      downloadName="data.csv"
      downloadMime="text/csv"
      placeholder={"name\trole\tcity\nAda\tEngineer\tLondon"}
    />
  );
}
