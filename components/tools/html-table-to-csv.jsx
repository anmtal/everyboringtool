"use client";
import TextConvert from "./_text-convert";
import { htmlTableToCsv } from "../../lib/dataConvert";

export default function HtmlTableToCsv() {
  return (
    <TextConvert
      inLabel="Paste HTML that contains a table"
      outLabel="CSV"
      actionLabel="Extract to CSV"
      transform={htmlTableToCsv}
      downloadName="table.csv"
      downloadMime="text/csv"
      placeholder={"<table><tr><th>Name</th><th>City</th></tr><tr><td>Ada</td><td>London</td></tr></table>"}
    />
  );
}
