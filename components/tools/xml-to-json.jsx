"use client";
import TextConvert from "./_text-convert";
import { xmlToJson } from "../../lib/dataConvert";

export default function XmlToJson() {
  return (
    <TextConvert
      inLabel="Paste your XML"
      outLabel="JSON"
      actionLabel="Convert to JSON"
      transform={xmlToJson}
      downloadName="data.json"
      downloadMime="application/json"
      placeholder={"<note>\n  <to>You</to>\n  <from>Me</from>\n  <body>Hello</body>\n</note>"}
    />
  );
}
