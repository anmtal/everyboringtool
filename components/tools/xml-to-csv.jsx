"use client";
import TextConvert from "./_text-convert";
import { xmlToCsv } from "../../lib/dataConvert";

export default function XmlToCsv() {
  return (
    <TextConvert
      inLabel="Paste your XML (a root element with repeated records)"
      outLabel="CSV"
      actionLabel="Convert to CSV"
      transform={xmlToCsv}
      downloadName="data.csv"
      downloadMime="text/csv"
      placeholder={"<records>\n  <record><name>Ada</name><age>36</age></record>\n  <record><name>Grace</name><age>45</age></record>\n</records>"}
    />
  );
}
