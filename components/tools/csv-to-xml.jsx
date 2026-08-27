"use client";
import TextConvert from "./_text-convert";
import { csvToXml } from "../../lib/dataConvert";

export default function CsvToXml() {
  return (
    <TextConvert
      inLabel="Paste your CSV (first row = column names)"
      outLabel="XML"
      actionLabel="Convert to XML"
      transform={csvToXml}
      downloadName="data.xml"
      downloadMime="application/xml"
      placeholder={"name,email,age\nAda,ada@example.com,36\nGrace,grace@example.com,45"}
    />
  );
}
